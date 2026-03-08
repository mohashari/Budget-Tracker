'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema, type CategoryInput } from '@/lib/validations/category'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TYPE_LABELS: Record<string, string> = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
  TRANSFER: 'Transfer',
}

const TYPE_COLORS: Record<string, string> = {
  INCOME: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
}

export default function CategoriesPage() {
  const { data: categories, isLoading, mutate } = useSWR('/api/categories', fetcher)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filterType, setFilterType] = useState('ALL')

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: 'EXPENSE', icon: 'circle', color: '#6366f1' },
  })

  const selectedType = watch('type')
  const selectedColor = watch('color')

  const openCreate = () => {
    reset({ type: 'EXPENSE', icon: 'circle', color: '#6366f1' })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (cat: any) => {
    reset({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color })
    setEditing(cat)
    setOpen(true)
  }

  const onSubmit = async (data: any) => {
    const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
    const method = editing ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success(editing ? 'Kategori diperbarui' : 'Kategori dibuat')
      setOpen(false)
      mutate()
    } else {
      const json = await res.json()
      toast.error(json.error ?? 'Gagal menyimpan')
    }
  }

  const handleDelete = async (cat: any) => {
    if (cat._count?.transactions > 0) {
      toast.error(`Kategori ini memiliki ${cat._count.transactions} transaksi, tidak dapat dihapus`)
      return
    }
    if (!confirm(`Hapus kategori "${cat.name}"?`)) return
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Kategori dihapus')
      mutate()
    } else {
      const json = await res.json()
      toast.error(json.error ?? 'Gagal menghapus')
    }
  }

  const filtered = categories?.filter((c: any) => filterType === 'ALL' || c.type === filterType) ?? []
  const grouped = filtered.reduce((acc: any, c: any) => {
    if (!acc[c.type]) acc[c.type] = []
    acc[c.type].push(c)
    return acc
  }, {})

  const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kategori</h2>
          <p className="text-sm text-muted-foreground">Kelola kategori transaksi Anda</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Tambah Kategori
        </Button>
      </div>

      <div className="flex gap-2">
        {['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'].map((t) => (
          <Button key={t} variant={filterType === t ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(t)}>
            {t === 'ALL' ? 'Semua' : TYPE_LABELS[t]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !filtered.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p>Belum ada kategori</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>Buat kategori pertama</Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, cats]: [string, any]) => (
          <div key={type}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {TYPE_LABELS[type]} ({cats.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cats.map((cat: any) => (
                <Card key={cat.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: cat.color }}>
                          {cat.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">{cat._count?.transactions ?? 0} transaksi</p>
                        </div>
                      </div>
                      <div className="hidden group-hover:flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(cat)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <div className="flex gap-2">
                {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((t) => (
                  <Button key={t} type="button" size="sm"
                    variant={selectedType === t ? 'default' : 'outline'}
                    onClick={() => setValue('type', t)}>
                    {TYPE_LABELS[t]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama *</Label>
              <Input id="name" placeholder="Nama kategori..." {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{(errors.name as any).message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setValue('color', c)}
                  />
                ))}
                <input type="color" value={selectedColor} onChange={(e) => setValue('color', e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border-0" title="Warna kustom" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Kategori'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
