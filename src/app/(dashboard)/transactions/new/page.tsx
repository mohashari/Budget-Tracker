'use client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, type TransactionInput } from '@/lib/validations/transaction'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function NewTransactionPage() {
  const router = useRouter()
  const { data: categories } = useSWR('/api/categories', fetcher)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      currency: 'IDR',
      date: format(new Date(), 'yyyy-MM-dd'),
      tags: [],
    },
  })

  const selectedType = watch('type')

  const onSubmit = async (data: any) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success('Transaksi berhasil ditambahkan')
      router.push('/transactions')
    } else {
      const json = await res.json()
      toast.error(json.error ?? 'Gagal menyimpan transaksi')
    }
  }

  const filteredCategories = categories?.filter((c: any) =>
    selectedType === 'TRANSFER' ? c.type === 'TRANSFER' : c.type === selectedType
  ) ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/transactions"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Tambah Transaksi</h2>
          <p className="text-sm text-muted-foreground">Catat pemasukan atau pengeluaran baru</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>Tipe Transaksi</Label>
              <div className="flex gap-2">
                {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((t) => (
                  <Button key={t} type="button" variant={selectedType === t ? 'default' : 'outline'}
                    className={selectedType === t && t === 'INCOME' ? 'bg-green-600 hover:bg-green-700' :
                      selectedType === t && t === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => { setValue('type', t); setValue('categoryId', undefined) }}>
                    {t === 'INCOME' ? 'Pemasukan' : t === 'EXPENSE' ? 'Pengeluaran' : 'Transfer'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah *</Label>
                <Input id="amount" type="number" step="1" placeholder="100000" {...register('amount')} />
                {errors.amount && <p className="text-xs text-red-500">{(errors.amount as any).message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal *</Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && <p className="text-xs text-red-500">{(errors.date as any).message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi *</Label>
              <Input id="description" placeholder="Makan siang, Gaji bulan ini..." {...register('description')} />
              {errors.description && <p className="text-xs text-red-500">{(errors.description as any).message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select onValueChange={(v) => v && setValue('categoryId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea id="notes" placeholder="Catatan tambahan..." rows={3} {...register('notes')} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Simpan Transaksi'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/transactions">Batal</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
