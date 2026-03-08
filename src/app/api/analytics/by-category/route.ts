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
    const type = searchParams.get('type') ?? 'EXPENSE'
    const key = cacheKey('by-category', ws.id, monthParam, type)

    const cached = await redis.get(key)
    if (cached) return NextResponse.json(JSON.parse(cached))

    const monthDate = parseISO(`${monthParam}-01`)
    const dateFrom = startOfMonth(monthDate)
    const dateTo = endOfMonth(monthDate)

    const transactions = await prisma.transaction.findMany({
      where: { workspaceId: ws.id, type: type as any, date: { gte: dateFrom, lte: dateTo }, categoryId: { not: null } },
      include: { category: true },
    })

    const grouped: Record<string, { total: number; count: number; category: any }> = {}
    for (const t of transactions) {
      if (!t.category) continue
      if (!grouped[t.categoryId!]) {
        grouped[t.categoryId!] = { total: 0, count: 0, category: t.category }
      }
      grouped[t.categoryId!].total += Number(t.amount)
      grouped[t.categoryId!].count++
    }

    const grandTotal = Object.values(grouped).reduce((s, g) => s + g.total, 0)
    const breakdown = Object.entries(grouped)
      .map(([categoryId, g]) => ({
        categoryId,
        name: g.category.name,
        color: g.category.color,
        icon: g.category.icon,
        total: g.total,
        percentage: grandTotal > 0 ? Math.round((g.total / grandTotal) * 100) : 0,
        count: g.count,
      }))
      .sort((a, b) => b.total - a.total)

    await redis.setex(key, CACHE_TTL.ANALYTICS_CATEGORY, JSON.stringify(breakdown))
    return NextResponse.json(breakdown)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
