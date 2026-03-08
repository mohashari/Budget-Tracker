/**
 * Report worker — run as a standalone process (not in Next.js)
 * Usage: npx tsx src/workers/report.worker.ts
 */
import 'dotenv/config'
import { Worker } from 'bullmq'
import { connection, JOB_NAMES } from '@/lib/queue'
import { prisma } from '@/lib/db'
import { generatePdfBuffer, buildReportData, renderReportHtml } from '@/lib/pdf'
import { uploadToS3 } from '@/lib/s3'
import { formatCurrency } from '@/lib/currency'
import Papa from 'papaparse'
import { format } from 'date-fns'

const worker = new Worker(
  'reports',
  async (job) => {
    const { reportId } = job.data

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { workspace: true, user: true },
    })
    if (!report) throw new Error(`Report ${reportId} not found`)

    await prisma.report.update({ where: { id: reportId }, data: { status: 'PROCESSING' } })

    const ws = report.workspace
    const start = new Date(report.periodStart)
    const end = new Date(report.periodEnd)

    // Fetch all data needed for report
    const [transactions, budgets] = await Promise.all([
      prisma.transaction.findMany({
        where: { workspaceId: ws.id, date: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { date: 'desc' },
      }),
      prisma.budget.findMany({
        where: { workspaceId: ws.id },
        include: { category: true },
      }),
    ])

    if (job.name === JOB_NAMES.GENERATE_PDF) {
      // Aggregate summary
      const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
      const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

      // Category breakdown (expense only)
      const catMap = new Map<string, { name: string; color: string; total: number; count: number }>()
      for (const t of transactions.filter((t) => t.type === 'EXPENSE' && t.category)) {
        const key = t.categoryId!
        const existing = catMap.get(key)
        if (existing) {
          existing.total += Number(t.amount)
          existing.count++
        } else {
          catMap.set(key, { name: t.category!.name, color: t.category!.color, total: Number(t.amount), count: 1 })
        }
      }
      const categories = [...catMap.values()].sort((a, b) => b.total - a.total)

      // Budget vs actual for the month range
      const month = format(start, 'yyyy-MM')
      const monthBudgets = budgets.filter((b) => b.month === month)
      const budgetData = monthBudgets.map((b) => {
        const spent = transactions
          .filter((t) => t.type === 'EXPENSE' && t.categoryId === b.categoryId)
          .reduce((s, t) => s + Number(t.amount), 0)
        return { name: b.category.name, color: b.category.color, limit: Number(b.limitAmount), spent }
      })

      // Top 10 transactions by amount
      const topTransactions = [...transactions]
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 10)
        .map((t) => ({
          date: t.date,
          description: t.description,
          category: t.category?.name ?? 'Lainnya',
          type: t.type,
          amount: Number(t.amount),
        }))

      const allTx = transactions.map((t) => ({
        date: t.date,
        description: t.description,
        notes: t.notes,
        category: t.category?.name ?? 'Lainnya',
        type: t.type,
        amount: Number(t.amount),
      }))

      const reportData = buildReportData({
        workspaceName: ws.name,
        currency: ws.currency,
        periodStart: start,
        periodEnd: end,
        summary: {
          income,
          expense,
          incomeCount: transactions.filter((t) => t.type === 'INCOME').length,
          expenseCount: transactions.filter((t) => t.type === 'EXPENSE').length,
        },
        categories,
        budgets: budgetData,
        topTransactions,
        transactions: allTx,
      })

      const html = renderReportHtml(reportData)
      const pdfBuffer = await generatePdfBuffer(html)
      const key = `reports/${ws.id}/${reportId}.pdf`
      await uploadToS3(key, pdfBuffer, 'application/pdf')

      await prisma.report.update({ where: { id: reportId }, data: { status: 'DONE', fileUrl: key } })
    } else if (job.name === JOB_NAMES.GENERATE_CSV) {
      const rows = transactions.map((t) => ({
        Date: format(new Date(t.date), 'yyyy-MM-dd'),
        Description: t.description,
        Category: t.category?.name ?? '',
        Type: t.type,
        Amount: Number(t.amount).toFixed(2),
        Currency: t.currency,
        Tags: t.tags.join(';'),
        Notes: t.notes ?? '',
      }))

      const csv = Papa.unparse(rows)
      const buffer = Buffer.from(csv, 'utf-8')
      const key = `reports/${ws.id}/${reportId}.csv`
      await uploadToS3(key, buffer, 'text/csv')

      await prisma.report.update({ where: { id: reportId }, data: { status: 'DONE', fileUrl: key } })
    }
  },
  {
    connection,
    concurrency: 2,
  }
)

worker.on('completed', (job) => console.log(`[report-worker] Job ${job.id} completed`))
worker.on('failed', async (job, err) => {
  console.error(`[report-worker] Job ${job?.id} failed:`, err.message)
  if (job?.data?.reportId) {
    await prisma.report.update({ where: { id: job.data.reportId }, data: { status: 'FAILED' } }).catch(() => {})
  }
})

console.log('[report-worker] Started, waiting for jobs...')
