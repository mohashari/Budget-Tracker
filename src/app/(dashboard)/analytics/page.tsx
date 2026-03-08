'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/currency'
import { format, parseISO, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function MonthSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: id }) }
  })
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function OverviewTab({ month }: { month: string }) {
  const { data: summary, isLoading } = useSWR(`/api/analytics/summary?month=${month}`, fetcher)

  const cards = summary ? [
    { title: 'Pemasukan', value: summary.income, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Pengeluaran', value: summary.expense, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Saldo', value: summary.balance, icon: Wallet, color: summary.balance >= 0 ? 'text-indigo-600' : 'text-red-600', bg: 'bg-indigo-50' },
    { title: 'Tingkat Tabungan', value: summary.savingsRate, icon: PiggyBank, color: 'text-blue-600', bg: 'bg-blue-50', isPercent: true },
  ] : []

  if (isLoading) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className={`text-xl font-bold mt-1 ${card.color}`}>
                    {card.isPercent ? `${card.value}%` : formatCurrency(card.value, 'IDR')}
                  </p>
                </div>
                <div className={`rounded-full p-2.5 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{summary?.transactionCount ?? 0} transaksi bulan ini</p>
    </div>
  )
}

function ByCategoryTab({ month }: { month: string }) {
  const { data: expData, isLoading: loadingExp } = useSWR(`/api/analytics/by-category?month=${month}&type=EXPENSE`, fetcher)
  const { data: incData, isLoading: loadingInc } = useSWR(`/api/analytics/by-category?month=${month}&type=INCOME`, fetcher)

  const total = expData?.reduce((s: number, c: any) => s + c.total, 0) ?? 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Pengeluaran per Kategori</CardTitle></CardHeader>
        <CardContent>
          {loadingExp ? <Skeleton className="h-64 w-full" /> : !expData?.length ? (
            <p className="text-center text-muted-foreground py-12">Tidak ada data pengeluaran</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={expData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {expData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatCurrency(val, 'IDR')} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {expData.map((cat: any) => (
                  <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate max-w-32">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{cat.percentage}%</span>
                      <span className="font-medium">{formatCurrency(cat.total, 'IDR')}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total, 'IDR')}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pemasukan per Kategori</CardTitle></CardHeader>
        <CardContent>
          {loadingInc ? <Skeleton className="h-48 w-full" /> : !incData?.length ? (
            <p className="text-center text-muted-foreground py-12">Tidak ada data pemasukan</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
                <Tooltip formatter={(val: any) => formatCurrency(val, 'IDR')} />
                <Bar dataKey="total" name="Pemasukan" radius={[0, 4, 4, 0]}>
                  {incData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TrendTab() {
  const { data: trend, isLoading } = useSWR('/api/analytics/trend?months=12', fetcher)

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tren 12 Bulan Terakhir</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-72 w-full" /> : !trend?.length ? (
          <p className="text-center text-muted-foreground py-16">Belum ada data tren</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tickFormatter={(v) => format(parseISO(`${v}-01`), 'MMM yy', { locale: id })} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: any) => formatCurrency(val, 'IDR')}
                labelFormatter={(l) => format(parseISO(`${l}-01`), 'MMMM yyyy', { locale: id })}
              />
              <Legend />
              <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#colorInc)" name="Pemasukan" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#colorExp)" name="Pengeluaran" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Analitik</h2>
          <p className="text-sm text-muted-foreground">Analisis keuangan Anda</p>
        </div>
        <MonthSelector value={month} onChange={setMonth} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="category">Per Kategori</TabsTrigger>
          <TabsTrigger value="trend">Tren</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <OverviewTab month={month} />
        </TabsContent>
        <TabsContent value="category" className="mt-6">
          <ByCategoryTab month={month} />
        </TabsContent>
        <TabsContent value="trend" className="mt-6">
          <TrendTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
