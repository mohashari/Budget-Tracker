import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redis, CACHE_TTL, cacheKey } from '@/lib/redis'
import { getCurrentWorkspace } from '@/lib/workspace'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ws = await getCurrentWorkspace()
    if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

    const months = parseInt(req.nextUrl.searchParams.get('months') ?? '12')
    const key = cacheKey('trend', ws.id, String(months))

    const cached = await redis.get(key)
    if (cached) return NextResponse.json(JSON.parse(cached))

    const now = new Date()
    const trend = []

    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i)
      const dateFrom = startOfMonth(d)
      const dateTo = endOfMonth(d)

      const result = await prisma.transaction.groupBy({
        by: ['type'],
        where: { workspaceId: ws.id, date: { gte: dateFrom, lte: dateTo } },
        _sum: { amount: true },
      })

      const income = Number(result.find((r) => r.type === 'INCOME')?._sum.amount ?? 0)
      const expense = Number(result.find((r) => r.type === 'EXPENSE')?._sum.amount ?? 0)
      trend.push({ month: format(d, 'yyyy-MM'), income, expense, balance: income - expense })
    }

    await redis.setex(key, CACHE_TTL.ANALYTICS_TREND, JSON.stringify(trend))
    return NextResponse.json(trend)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
