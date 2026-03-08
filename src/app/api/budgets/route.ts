import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { budgetSchema } from '@/lib/validations/budget'
import { getCurrentWorkspace } from '@/lib/workspace'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ws = await getCurrentWorkspace()
  if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  const budgets = await prisma.budget.findMany({
    where: { workspaceId: ws.id, month },
    include: { category: true },
    orderBy: { category: { name: 'asc' } },
  })

  // Calculate spent for each budget
  const monthStart = new Date(`${month}-01`)
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)

  const result = await Promise.all(
    budgets.map(async (b) => {
      const agg = await prisma.transaction.aggregate({
        where: {
          workspaceId: ws.id,
          categoryId: b.categoryId,
          type: 'EXPENSE',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      })
      const spent = Number(agg._sum.amount ?? 0)
      const limit = Number(b.limitAmount)
      return {
        ...b,
        limitAmount: limit,
        spent,
        remaining: limit - spent,
        utilization: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      }
    })
  )

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ws = await getCurrentWorkspace()
  if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const body = await req.json()
  const parsed = budgetSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const budget = await prisma.budget.upsert({
    where: { workspaceId_categoryId_month: { workspaceId: ws.id, categoryId: parsed.data.categoryId, month: parsed.data.month } },
    create: { ...parsed.data, workspaceId: ws.id },
    update: { limitAmount: parsed.data.limitAmount, alertAt: parsed.data.alertAt },
    include: { category: true },
  })
  return NextResponse.json(budget, { status: 201 })
}
