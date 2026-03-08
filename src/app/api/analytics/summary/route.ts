import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redis, CACHE_TTL, cacheKey } from '@/lib/redis'
import { getCurrentWorkspace } from '@/lib/workspace'
import { startOfMonth, endOfMonth, parseISO } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ws = await getCurrentWorkspace()
    if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

    const { searchParams } = req.nextUrl
    const monthParam = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
    const key = cacheKey('summary', ws.id, monthParam)

    const cached = await redis.get(key)
    if (cached) return NextResponse.json(JSON.parse(cached))

    const monthDate = parseISO(`${monthParam}-01`)
    const dateFrom = startOfMonth(monthDate)
    const dateTo = endOfMonth(monthDate)

    const result = await prisma.transaction.groupBy({
      by: ['type'],
      where: { workspaceId: ws.id, date: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
      _count: true,
    })

    const income = Number(result.find((r) => r.type === 'INCOME')?._sum.amount ?? 0)
    const expense = Number(result.find((r) => r.type === 'EXPENSE')?._sum.amount ?? 0)
    const balance = income - expense
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
    const transactionCount = result.reduce((sum, r) => sum + r._count, 0)

    const summary = { income, expense, balance, savingsRate, transactionCount }
    await redis.setex(key, CACHE_TTL.ANALYTICS_SUMMARY, JSON.stringify(summary))

    return NextResponse.json(summary)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
