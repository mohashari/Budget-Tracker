'use client'
import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/currency'
import { Plus, Search, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>('ALL')
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (search) params.set('search', search)
  if (type !== 'ALL') params.set('type', type)

  const { data, isLoading, mutate } = useSWR(`/api/transactions?${params}`, fetcher)

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    toast.success('Transaksi dihapus')
    mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaksi</h2>
          <p className="text-sm text-muted-foreground">Kelola semua transaksi Anda</p>
        </div>
        <Button asChild>
          <Link href="/transactions/new"><Plus className="mr-2 h-4 w-4" />Tambah</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari transaksi..." className="pl-9" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <Select value={type} onValueChange={(v) => { if (v) { setType(v); setPage(1) } }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem value="INCOME">Pemasukan</SelectItem>
                <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !data?.data?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Belum ada transaksi</p>
              <Button variant="outline" className="mt-3" asChild>
                <Link href="/transactions/new">Tambah transaksi pertama</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {data.data.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ backgroundColor: (tx.category?.color ?? '#6366f1') + '20', color: tx.category?.color ?? '#6366f1' }}>
                        {(tx.category?.name ?? 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.category?.name ?? 'Uncategorized'} · {format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                        </p>
                        <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                      </div>
                      <div className="hidden group-hover:flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/transactions/${tx.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(tx.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {data.total} transaksi · Hal {page} dari {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
