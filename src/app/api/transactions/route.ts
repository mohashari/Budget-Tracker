import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { transactionSchema, transactionFilterSchema } from '@/lib/validations/transaction'
import { invalidateWorkspaceCache } from '@/lib/redis'
import { getCurrentWorkspace } from '@/lib/workspace'
import { notificationsQueue, JOB_NAMES } from '@/lib/queue'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ws = await getCurrentWorkspace()
    if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

    const { searchParams } = req.nextUrl
    const filters = transactionFilterSchema.parse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 20,
      type: searchParams.get('type') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
    })

    const where: any = { workspaceId: ws.id }
    if (filters.type) where.type = filters.type
    if (filters.categoryId) where.categoryId = filters.categoryId
    if (filters.search) where.description = { contains: filters.search, mode: 'insensitive' }
    if (filters.dateFrom || filters.dateTo) {
      where.date = {}
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom)
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo)
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true, user: { select: { id: true, name: true } } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({
      data: transactions,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ws = await getCurrentWorkspace()
    if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

    const body = await req.json()
    const parsed = transactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...parsed.data,
        date: new Date(parsed.data.date),
        workspaceId: ws.id,
        userId: session.user.id,
      },
      include: { category: true },
    })

    await invalidateWorkspaceCache(ws.id)

    // Budget alert check for EXPENSE transactions
    if (transaction.type === 'EXPENSE' && transaction.categoryId) {
      try {
        const month = format(new Date(transaction.date), 'yyyy-MM')
        const budget = await prisma.budget.findFirst({
          where: { workspaceId: ws.id, categoryId: transaction.categoryId, month },
          include: { category: true },
        })
        if (budget) {
          const [startDate, endDate] = (() => {
            const [y, m] = month.split('-').map(Number)
            return [new Date(y, m - 1, 1), new Date(y, m, 0)]
          })()
          const agg = await prisma.transaction.aggregate({
            where: { workspaceId: ws.id, categoryId: transaction.categoryId, type: 'EXPENSE', date: { gte: startDate, lte: endDate } },
            _sum: { amount: true },
          })
          const spent = Number(agg._sum.amount ?? 0)
          const limit = Number(budget.limitAmount)
          const pct = limit > 0 ? (spent / limit) * 100 : 0
          if (pct >= budget.alertAt) {
            const members = await prisma.workspaceMember.findMany({
              where: { workspaceId: ws.id },
              include: { user: { select: { email: true } } },
            })
            await notificationsQueue.add(JOB_NAMES.BUDGET_ALERT, {
              workspaceId: ws.id,
              categoryId: transaction.categoryId,
              categoryName: budget.category.name,
              spent,
              limit,
              alertAt: budget.alertAt,
              currency: ws.currency,
              userEmails: members.map((m) => m.user.email),
            })
          }
        }
      } catch (alertErr) {
        console.error('[budget-alert] Failed to queue alert:', alertErr)
      }
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
