'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { budgetSchema, type BudgetInput } from '@/lib/validations/budget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getProgressColor(pct: number, alertAt: number) {
  if (pct >= 100) return 'bg-red-600'
  if (pct >= alertAt) return 'bg-yellow-500'
  return 'bg-green-500'
}

export default function BudgetPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const { data: budgets, isLoading, mutate } = useSWR(`/api/budgets?month=${month}`, fetcher)
  const { data: categories } = useSWR('/api/categories', fetcher)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { month, alertAt: 80 },
  })

  const openCreate = () => {
    reset({ month, alertAt: 80, limitAmount: undefined as any, categoryId: '' })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (budget: any) => {
    reset({
      categoryId: budget.categoryId,
      month: budget.month,
      limitAmount: budget.limitAmount,
      alertAt: budget.alertAt,
    })
    setEditing(budget)
    setOpen(true)
  }

  const onSubmit = async (data: any) => {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, month }),
    })
    if (res.ok) {
      toast.success(editing ? 'Budget diperbarui' : 'Budget dibuat')
      setOpen(false)
      mutate()
    } else {
      const json = await res.json()
      toast.error(json.error ?? 'Gagal menyimpan')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus budget ini?')) return
    const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Budget dihapus')
      mutate()
    }
  }

  const navigateMonth = (dir: 1 | -1) => {
    const current = parseISO(`${month}-01`)
    const next = dir === 1 ? addMonths(current, 1) : subMonths(current, 1)
    setMonth(format(next, 'yyyy-MM'))
  }

  const totalBudgeted = budgets?.reduce((s: number, b: any) => s + b.limitAmount, 0) ?? 0
  const totalSpent = budgets?.reduce((s: number, b: any) => s + b.spent, 0) ?? 0

  const expenseCategories = categories?.filter((c: any) => c.type === 'EXPENSE') ?? []
  const budgetedCategoryIds = new Set(budgets?.map((b: any) => b.categoryId) ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Budget</h2>
          <p className="text-sm text-muted-foreground">Kelola batas pengeluaran per kategori</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Tambah Budget
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium min-w-32 text-center">
          {format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: id })}
        </span>
        <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      {budgets && budgets.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Budget</p>
                <p className="font-bold text-lg">{formatCurrency(totalBudgeted, 'IDR')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Terpakai</p>
                <p className="font-bold text-lg text-red-600">{formatCurrency(totalSpent, 'IDR')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sisa</p>
                <p className={`font-bold text-lg ${totalBudgeted - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalBudgeted - totalSpent, 'IDR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget list */}
      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !budgets?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p>Belum ada budget untuk bulan ini</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>Buat budget pertama</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget: any) => {
            const pct = budget.utilization
            const colorClass = getProgressColor(pct, budget.alertAt)
            return (
              <Card key={budget.id} className="group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: budget.category?.color ?? '#6366f1' }}>
                        {budget.category?.name?.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{budget.category?.name}</p>
                        <p className="text-xs text-muted-foreground">Alert di {budget.alertAt}%</p>
                      </div>
                    </div>
                    <div className="hidden group-hover:flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(budget)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(budget.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{formatCurrency(budget.spent, 'IDR')} terpakai</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${colorClass}`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className={budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {budget.remaining >= 0 ? 'Sisa ' : 'Melebihi '}{formatCurrency(Math.abs(budget.remaining), 'IDR')}
                      </span>
                      <span className="text-muted-foreground">dari {formatCurrency(budget.limitAmount, 'IDR')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Budget' : 'Tambah Budget'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori *</Label>
              <Select
                value={watch('categoryId') ?? ''}
                onValueChange={(v) => v && setValue('categoryId', v)}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori pengeluaran" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories
                    .filter((c: any) => editing ? true : !budgetedCategoryIds.has(c.id))
                    .map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-red-500">{(errors.categoryId as any).message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="limitAmount">Batas Budget *</Label>
              <Input id="limitAmount" type="number" step="1000" placeholder="1000000" {...register('limitAmount')} />
              {errors.limitAmount && <p className="text-xs text-red-500">{(errors.limitAmount as any).message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertAt">Threshold Alert (%)</Label>
              <Input id="alertAt" type="number" min="1" max="100" {...register('alertAt')} />
              <p className="text-xs text-muted-foreground">Notifikasi ketika pengeluaran melebihi persentase ini</p>
              {errors.alertAt && <p className="text-xs text-red-500">{(errors.alertAt as any).message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Budget'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
