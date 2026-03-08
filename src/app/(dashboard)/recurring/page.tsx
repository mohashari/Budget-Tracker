'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useForm } from 'react-hook-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, RefreshCw, Pause, Play, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Harian',
  WEEKLY: 'Mingguan',
  BIWEEKLY: 'Dua Mingguan',
  MONTHLY: 'Bulanan',
  QUARTERLY: 'Per Kuartal',
  YEARLY: 'Tahunan',
}

export default function RecurringPage() {
  const { data: rules, isLoading, mutate } = useSWR('/api/recurring', fetcher)
  const { data: categories } = useSWR('/api/categories', fetcher)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      type: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: format(new Date(), 'yyyy-MM-dd'),
    } as any,
  })

  const selectedType = watch('type')

  const openCreate = () => {
    reset({ type: 'EXPENSE', frequency: 'MONTHLY', startDate: format(new Date(), 'yyyy-MM-dd') })
    setOpen(true)
  }

  const onSubmit = async (data: any) => {
    setSubmitting(true)
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Transaksi berulang dibuat')
      setOpen(false)
      mutate()
    } else {
      const json = await res.json()
      toast.error(json.error ?? 'Gagal membuat')
    }
  }

  const toggleActive = async (rule: any) => {
    const res = await fetch(`/api/recurring/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    })
    if (res.ok) {
      toast.success(rule.isActive ? 'Dinonaktifkan' : 'Diaktifkan')
      mutate()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan transaksi berulang ini?')) return
    await fetch(`/api/recurring/${id}`, { method: 'DELETE' })
    toast.success('Dinonaktifkan')
    mutate()
  }

  const filteredCategories = categories?.filter((c: any) =>
    selectedType === 'TRANSFER' ? c.type === 'TRANSFER' : c.type === selectedType
  ) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaksi Berulang</h2>
          <p className="text-sm text-muted-foreground">Otomasi transaksi periodik</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Tambah
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !rules?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada transaksi berulang</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>Buat yang pertama</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule: any) => (
            <Card key={rule.id} className={`group ${!rule.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: (rule.category?.color ?? '#6366f1') + '20' }}>
                      <RefreshCw className="h-4 w-4" style={{ color: rule.category?.color ?? '#6366f1' }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{rule.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{FREQ_LABELS[rule.frequency]}</Badge>
                        {rule.category && (
                          <span className="text-xs text-muted-foreground">{rule.category.name}</span>
                        )}
                        {!rule.isActive && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Berikutnya: {format(new Date(rule.nextRunAt), 'dd MMM yyyy', { locale: id })}
                        {' · '}{rule._count?.transactions ?? 0}x dijalankan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`font-bold ${rule.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {rule.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(rule.amount), 'IDR')}
                    </p>
                    <div className="hidden group-hover:flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(rule)}
                        title={rule.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                        {rule.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Transaksi Berulang</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <div className="flex gap-2">
                {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((t) => (
                  <Button key={t} type="button" size="sm"
                    variant={selectedType === t ? 'default' : 'outline'}
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
                <Label>Jumlah *</Label>
                <Input type="number" step="1" placeholder="500000" {...register('amount', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Frekuensi</Label>
                <Select defaultValue="MONTHLY" onValueChange={(v) => setValue('frequency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQ_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deskripsi *</Label>
              <Input placeholder="Gaji bulanan, Langganan Netflix..." {...register('description', { required: true })} />
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select onValueChange={(v) => setValue('categoryId', v)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mulai *</Label>
                <Input type="date" {...register('startDate', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Selesai (opsional)</Label>
                <Input type="date" {...register('endDate')} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Menyimpan...' : 'Buat Transaksi Berulang'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
