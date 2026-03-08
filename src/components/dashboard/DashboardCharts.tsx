'use client'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { formatCurrency } from '@/lib/currency'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function DashboardCharts({ workspaceId }: { workspaceId: string }) {
  const month = new Date().toISOString().slice(0, 7)
  const { data: breakdown, isLoading: loadingBreakdown } = useSWR(
    `/api/analytics/by-category?month=${month}&type=EXPENSE`, fetcher
  )
  const { data: trend, isLoading: loadingTrend } = useSWR(
    `/api/analytics/trend?months=6`, fetcher
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Pengeluaran per Kategori</CardTitle></CardHeader>
        <CardContent>
          {loadingBreakdown ? <Skeleton className="h-64 w-full" /> : (
            !breakdown?.length ? (
              <p className="text-center text-muted-foreground py-16">Belum ada data pengeluaran</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={breakdown} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, ...props }: any) => `${name} ${props.percentage}%`} labelLine={false}>
                    {breakdown.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatCurrency(val, 'IDR')} />
                </PieChart>
              </ResponsiveContainer>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Tren 6 Bulan</CardTitle></CardHeader>
        <CardContent>
          {loadingTrend ? <Skeleton className="h-64 w-full" /> : (
            !trend?.length ? (
              <p className="text-center text-muted-foreground py-16">Belum ada data tren</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tickFormatter={(v) => format(parseISO(`${v}-01`), 'MMM', { locale: id })} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => formatCurrency(val, 'IDR')} labelFormatter={(l) => format(parseISO(`${l}-01`), 'MMMM yyyy', { locale: id })} />
                  <Legend />
                  <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#colorIncome)" name="Pemasukan" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#colorExpense)" name="Pengeluaran" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
