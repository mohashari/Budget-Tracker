'use client'
import { useState, useCallback, useRef } from 'react'
import useSWR from 'swr'
import Papa from 'papaparse'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, FileUp, X
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type ParsedRow = Record<string, string>
type MappedRow = {
  date: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  categoryId?: string | null
  notes?: string | null
  tags?: string[]
}

const FIELD_OPTIONS = ['date', 'description', 'amount', 'type', 'notes', 'tags', '(skip)'] as const
const PRESETS: Record<string, Record<string, string>> = {
  generic: {},
  bca: { Tanggal: 'date', Keterangan: 'description', 'Nominal(Rp)': 'amount' },
  mandiri: { TANGGAL: 'date', KETERANGAN: 'description', NOMINAL: 'amount', 'DEBIT/KREDIT': 'type' },
  gopay: { Date: 'date', Description: 'description', Amount: 'amount', Type: 'type' },
}

function autoDetectType(row: ParsedRow, typeCol?: string): 'INCOME' | 'EXPENSE' | 'TRANSFER' {
  if (!typeCol) return 'EXPENSE'
  const val = (row[typeCol] ?? '').toLowerCase()
  if (val.includes('cr') || val.includes('kredit') || val.includes('income') || val.includes('masuk')) return 'INCOME'
  if (val.includes('transfer')) return 'TRANSFER'
  return 'EXPENSE'
}

function parseAmount(raw: string): number {
  return Math.abs(parseFloat(raw.replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0)
}

export default function ImportPage() {
  const router = useRouter()
  const { data: catData } = useSWR('/api/categories', fetcher)
  const categories = catData?.data ?? []

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [file, setFile] = useState<File | null>(null)
  const [rawRows, setRawRows] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [preset, setPreset] = useState('generic')
  const [preview, setPreview] = useState<MappedRow[]>([])
  const [catAssign, setCatAssign] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: { row: number; error: string }[] } | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  function handleFile(f: File) {
    setFile(f)
    Papa.parse<ParsedRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRawRows(res.data)
        setHeaders(res.meta.fields ?? [])
        // Apply preset if selected
        const p = PRESETS[preset] ?? {}
        const defaultMapping: Record<string, string> = {}
        for (const h of (res.meta.fields ?? [])) {
          defaultMapping[h] = p[h] ?? '(skip)'
        }
        setMapping(defaultMapping)
        setStep(2)
      },
    })
  }

  function applyPreset(name: string) {
    setPreset(name)
    const p = PRESETS[name] ?? {}
    const newMapping: Record<string, string> = {}
    for (const h of headers) {
      newMapping[h] = p[h] ?? '(skip)'
    }
    setMapping(newMapping)
  }

  function buildPreview() {
    const dateCol = Object.entries(mapping).find(([, v]) => v === 'date')?.[0]
    const descCol = Object.entries(mapping).find(([, v]) => v === 'description')?.[0]
    const amtCol = Object.entries(mapping).find(([, v]) => v === 'amount')?.[0]
    const typeCol = Object.entries(mapping).find(([, v]) => v === 'type')?.[0]
    const notesCol = Object.entries(mapping).find(([, v]) => v === 'notes')?.[0]

    if (!dateCol || !descCol || !amtCol) {
      toast.error('Wajib memetakan kolom: date, description, amount')
      return
    }

    const rows: MappedRow[] = rawRows.slice(0, 200).map((row) => ({
      date: row[dateCol] ?? '',
      description: row[descCol] ?? '',
      amount: parseAmount(row[amtCol] ?? '0'),
      type: autoDetectType(row, typeCol),
      notes: notesCol ? row[notesCol] : null,
    }))
    setPreview(rows)
    setStep(3)
  }

  async function handleImport() {
    setImporting(true)
    try {
      const dateCol = Object.entries(mapping).find(([, v]) => v === 'date')?.[0]
      const descCol = Object.entries(mapping).find(([, v]) => v === 'description')?.[0]
      const amtCol = Object.entries(mapping).find(([, v]) => v === 'amount')?.[0]
      const typeCol = Object.entries(mapping).find(([, v]) => v === 'type')?.[0]
      const notesCol = Object.entries(mapping).find(([, v]) => v === 'notes')?.[0]

      const rows = rawRows.map((row, i) => ({
        date: row[dateCol!] ?? '',
        description: row[descCol!] ?? '',
        amount: parseAmount(row[amtCol!] ?? '0'),
        type: autoDetectType(row, typeCol),
        notes: notesCol ? row[notesCol] : null,
        categoryId: catAssign[i] || null,
      })).filter((r) => r.amount > 0 && r.description && r.date)

      const res = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, skipDuplicates: true }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error('Import gagal'); return }
      setResult(json.data)
      setStep(4)
    } finally {
      setImporting(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) handleFile(f)
    else toast.error('Hanya file CSV yang didukung')
  }, [preset])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Transaksi CSV</h1>
        <p className="text-muted-foreground text-sm">Import transaksi dari file CSV bank atau kustom</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {(['Upload', 'Petakan Kolom', 'Preview', 'Selesai'] as const).map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'
            }`}>{step > i + 1 ? '✓' : i + 1}</div>
            <span className={step === i + 1 ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
            {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Upload File CSV</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {Object.keys(PRESETS).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    preset === p ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border hover:border-indigo-300'
                  }`}
                >
                  {p === 'generic' ? 'Generic' : p.toUpperCase()}
                </button>
              ))}
            </div>
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Drag & drop file CSV atau klik untuk memilih</p>
              <p className="text-sm text-muted-foreground mt-1">Mendukung format Generic, BCA, Mandiri, GoPay/OVO</p>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map columns */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Petakan Kolom CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              {Object.keys(PRESETS).map((p) => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    preset === p ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border hover:border-indigo-300'
                  }`}
                >
                  {p === 'generic' ? 'Generic' : p.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{rawRows.length} baris ditemukan di <strong>{file?.name}</strong></p>
            <div className="space-y-2">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <span className="font-mono text-sm w-40 truncate">{h}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <select
                    value={mapping[h] ?? '(skip)'}
                    onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                    className="border rounded px-2 py-1 text-sm bg-background flex-1"
                  >
                    {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  {rawRows[0]?.[h] && (
                    <span className="text-xs text-muted-foreground truncate max-w-32">e.g. {rawRows[0][h]}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Button>
              <Button onClick={buildPreview}>Preview <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & assign categories */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Transaksi ({preview.length} dari {rawRows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Deskripsi</th>
                    <th className="py-2 px-3 text-right">Jumlah</th>
                    <th className="py-2 px-3">Tipe</th>
                    <th className="py-2 px-3">Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 text-xs">{row.date}</td>
                      <td className="py-2 px-3 max-w-48 truncate">{row.description}</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {row.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          row.type === 'INCOME' ? 'bg-green-100 text-green-800' :
                          row.type === 'TRANSFER' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>{row.type}</span>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={catAssign[i] ?? ''}
                          onChange={(e) => setCatAssign({ ...catAssign, [i]: e.target.value })}
                          className="border rounded px-1 py-0.5 text-xs bg-background w-32"
                        >
                          <option value="">-- Pilih --</option>
                          {categories.map((c: { id: string; name: string }) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rawRows.length > 200 && (
              <p className="text-xs text-muted-foreground">
                * Menampilkan 200 baris pertama. Seluruh {rawRows.length} baris akan diimport.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileUp className="h-4 w-4 mr-1" />}
                Import {rawRows.length} Transaksi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === 4 && result && (
        <Card>
          <CardHeader><CardTitle>Hasil Import</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
                <div className="text-sm text-muted-foreground">Berhasil diimport</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl">
                <X className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
                <div className="text-sm text-muted-foreground">Dilewati (duplikat)</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-xl">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                <div className="text-sm text-muted-foreground">Gagal</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-1">
                <p className="font-medium text-red-700 text-sm">Error Detail:</p>
                {result.errors.slice(0, 10).map((e) => (
                  <p key={e.row} className="text-xs text-red-600">Baris {e.row}: {e.error}</p>
                ))}
                {result.errors.length > 10 && <p className="text-xs text-red-500">...dan {result.errors.length - 10} error lainnya</p>}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setStep(1); setFile(null); setResult(null) }}>
                Import Lagi
              </Button>
              <Button onClick={() => router.push('/transactions')}>
                Lihat Transaksi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
