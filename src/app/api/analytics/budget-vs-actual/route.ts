import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWorkspace } from '@/lib/workspace'
import { redis, cacheKey, CACHE_TTL } from '@/lib/redis'

export async function GET(req: NextRequest) {
  try {
    const ws = await requireWorkspace()
    const { searchParams } = req.nextUrl
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    const ck = cacheKey('budget-vs-actual', ws.id, month)
    const cached = await redis.get(ck)
    if (cached) return NextResponse.json({ data: JSON.parse(cached) })

    const budgets = await prisma.budget.findMany({
      where: { workspaceId: ws.id, month },
      include: { category: true },
    })

    const [startDate, endDate] = (() => {
      const [y, m] = month.split('-').map(Number)
      return [new Date(y, m - 1, 1), new Date(y, m, 0)]
    })()

    const data = await Promise.all(
      budgets.map(async (b) => {
        const agg = await prisma.transaction.aggregate({
          where: {
            workspaceId: ws.id,
            categoryId: b.categoryId,
            type: 'EXPENSE',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        })
        const spent = Number(agg._sum.amount ?? 0)
        const limit = Number(b.limitAmount)
        return {
          budgetId: b.id,
          categoryId: b.categoryId,
          categoryName: b.category.name,
          categoryColor: b.category.color,
          limit,
          spent,
          remaining: limit - spent,
          utilizationPct: limit > 0 ? Math.round((spent / limit) * 100) : 0,
          alertAt: b.alertAt,
        }
      })
    )

    await redis.setex(ck, CACHE_TTL.BUDGET_STATUS, JSON.stringify(data))
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
