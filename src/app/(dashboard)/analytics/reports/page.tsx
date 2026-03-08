'use client'
import { useState, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { FileText, Download, Trash2, RefreshCw, Loader2, Plus } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Report = {
  id: string
  type: string
  periodStart: string
  periodEnd: string
  status: string
  fileUrl: string | null
  createdAt: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  DONE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

function ReportRow({ report, onDelete }: { report: Report; onDelete: () => void }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/reports/${report.id}/download`)
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Download failed'); return }
      window.open(json.data.url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/reports/${report.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Laporan dihapus'); onDelete() }
    else toast.error('Gagal menghapus')
  }

  return (
    <tr className="border-b hover:bg-muted/40">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {report.type === 'PDF'
            ? <FileText className="h-4 w-4 text-red-500" />
            : <span className="text-green-600 font-mono text-xs font-bold">CSV</span>
          }
          <span className="font-medium">{report.type} Report</span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {format(new Date(report.periodStart), 'dd MMM yyyy', { locale: idLocale })} –{' '}
        {format(new Date(report.periodEnd), 'dd MMM yyyy', { locale: idLocale })}
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[report.status] ?? ''}`}>
          {report.status}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {format(new Date(report.createdAt), 'dd MMM yyyy HH:mm', { locale: idLocale })}
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2 justify-end">
          {report.status === 'DONE' && (
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            </Button>
          )}
          {report.status === 'PROCESSING' || report.status === 'PENDING' ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Memproses...
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={handleDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export default function ReportsPage() {
  const { data, isLoading, mutate: reloadReports } = useSWR('/api/reports', fetcher, { refreshInterval: 5000 })
  const reports: Report[] = data?.data ?? []

  const [open, setOpen] = useState(false)
  const [reportType, setReportType] = useState<'PDF' | 'CSV'>('PDF')
  const [periodPreset, setPeriodPreset] = useState('this-month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [generating, setGenerating] = useState(false)

  function getPeriodDates() {
    const now = new Date()
    if (periodPreset === 'this-month') return { start: startOfMonth(now), end: endOfMonth(now) }
    if (periodPreset === 'last-month') {
      const last = subMonths(now, 1)
      return { start: startOfMonth(last), end: endOfMonth(last) }
    }
    if (periodPreset === 'last-3-months') return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    if (periodPreset === 'last-6-months') return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) }
    if (periodPreset === 'this-year') return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) }
    return {
      start: customStart ? new Date(customStart) : startOfMonth(now),
      end: customEnd ? new Date(customEnd) : endOfMonth(now),
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const { start, end } = getPeriodDates()
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error?.fieldErrors ? 'Periode tidak valid' : 'Gagal membuat laporan'); return }
      toast.success(`Laporan ${reportType} sedang dibuat...`)
      setOpen(false)
      reloadReports()
    } finally {
      setGenerating(false)
    }
  }

  const hasProcessing = reports.some((r) => r.status === 'PENDING' || r.status === 'PROCESSING')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan</h1>
          <p className="text-muted-foreground text-sm">Generate dan unduh laporan PDF atau CSV</p>
        </div>
        <div className="flex gap-2">
          {hasProcessing && (
            <Button variant="outline" size="sm" onClick={() => reloadReports()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-1" />Buat Laporan</Button>} />
            <DialogContent className="max-w-md">
                <DialogTitle className="text-lg font-semibold mb-1">Buat Laporan Baru</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mb-4">
                  Pilih format dan periode laporan
                </DialogDescription>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['PDF', 'CSV'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setReportType(t)}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                            reportType === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'border-border hover:border-indigo-200'
                          }`}
                        >
                          {t === 'PDF' ? <FileText className="h-4 w-4 text-red-500" /> : <span className="text-green-600 font-mono font-bold text-xs">CSV</span>}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Periode</label>
                    <select
                      value={periodPreset}
                      onChange={(e) => setPeriodPreset(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    >
                      <option value="this-month">Bulan Ini</option>
                      <option value="last-month">Bulan Lalu</option>
                      <option value="last-3-months">3 Bulan Terakhir</option>
                      <option value="last-6-months">6 Bulan Terakhir</option>
                      <option value="this-year">Tahun Ini</option>
                      <option value="custom">Kustom</option>
                    </select>
                  </div>

                  {periodPreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Dari</label>
                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Sampai</label>
                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6 justify-end">
                  <DialogClose render={<Button variant="outline">Batal</Button>} />
                  <Button onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Generate
                  </Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Laporan</CardTitle>
          <CardDescription>Laporan yang pernah dibuat (50 terakhir)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada laporan</p>
              <p className="text-sm">Klik "Buat Laporan" untuk membuat laporan pertama</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 px-4 font-medium">Format</th>
                    <th className="py-2 px-4 font-medium">Periode</th>
                    <th className="py-2 px-4 font-medium">Status</th>
                    <th className="py-2 px-4 font-medium">Dibuat</th>
                    <th className="py-2 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <ReportRow key={r.id} report={r} onDelete={() => reloadReports()} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
