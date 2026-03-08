import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getCurrentWorkspace } from '@/lib/workspace'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowLeftRight } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'

async function getSummary(workspaceId: string) {
  const now = new Date()
  const dateFrom = startOfMonth(now)
  const dateTo = endOfMonth(now)

  const [result, recent] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['type'],
      where: { workspaceId, date: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { workspaceId },
      include: { category: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
  ])

  const income = Number(result.find((r) => r.type === 'INCOME')?._sum.amount ?? 0)
  const expense = Number(result.find((r) => r.type === 'EXPENSE')?._sum.amount ?? 0)
  const balance = income - expense
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0

  return { income, expense, balance, savingsRate, recent }
}

export default async function DashboardPage() {
  const session = await auth()
  const ws = await getCurrentWorkspace()
  if (!ws) return <div>No workspace found</div>

  const { income, expense, balance, savingsRate, recent } = await getSummary(ws.id)
  const currency = ws.currency

  const summaryCards = [
    { title: 'Pemasukan', value: income, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Pengeluaran', value: expense, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Saldo', value: balance, icon: Wallet, color: balance >= 0 ? 'text-indigo-600' : 'text-red-600', bg: 'bg-indigo-50' },
    { title: 'Tingkat Tabungan', value: savingsRate, icon: PiggyBank, color: 'text-blue-600', bg: 'bg-blue-50', isPercent: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Ringkasan bulan ini</p>
        </div>
        <Button asChild>
          <Link href="/transactions/new"><ArrowLeftRight className="mr-2 h-4 w-4" />Tambah Transaksi</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                    {card.isPercent ? `${card.value}%` : formatCurrency(card.value, currency)}
                  </p>
                </div>
                <div className={`rounded-full p-3 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <DashboardCharts workspaceId={ws.id} />
      </Suspense>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transaksi Terbaru</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions">Lihat Semua</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada transaksi</p>
          ) : (
            <div className="space-y-3">
              {recent.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: tx.category?.color + '20' }}>
                      <span>{tx.category?.icon?.slice(0, 1).toUpperCase() ?? '?'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.category?.name ?? 'Uncategorized'} · {new Date(tx.date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                    </p>
                    <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
