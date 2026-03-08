import path from 'node:path'
import fs from 'node:fs'
import Handlebars from 'handlebars'
import { formatCurrency } from '@/lib/currency'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export type ReportData = {
  workspace: string
  currency: string
  periodStart: string
  periodEnd: string
  periodLabel: string
  generatedAt: string
  summary: {
    income: string
    expense: string
    balance: string
    savingsRate: string
    incomeCount: number
    expenseCount: number
  }
  categories: Array<{
    name: string
    color: string
    total: string
    percentage: string
    count: number
  }>
  categoryTotal: string
  categoryTxCount: number
  budgets: Array<{
    name: string
    color: string
    limit: string
    spent: string
    remaining: string
    pct: string
    barWidth: string
    statusClass: string
    overBudget: boolean
  }>
  topTransactions: Array<{
    date: string
    description: string
    category: string
    type: string
    typeLower: string
    amount: string
  }>
  transactions: Array<{
    date: string
    description: string
    notes?: string
    category: string
    type: string
    typeLower: string
    amount: string
  }>
}

const templatePath = path.join(process.cwd(), 'templates', 'report.hbs')

function getTemplate() {
  const source = fs.readFileSync(templatePath, 'utf-8')
  return Handlebars.compile(source)
}

export function renderReportHtml(data: ReportData): string {
  const template = getTemplate()
  return template(data)
}

export function buildReportData(params: {
  workspaceName: string
  currency: string
  periodStart: Date
  periodEnd: Date
  summary: { income: number; expense: number; incomeCount: number; expenseCount: number }
  categories: Array<{ name: string; color: string; total: number; count: number }>
  budgets: Array<{ name: string; color: string; limit: number; spent: number }>
  topTransactions: Array<{ date: Date; description: string; category: string; type: string; amount: number }>
  transactions: Array<{ date: Date; description: string; notes?: string | null; category: string; type: string; amount: number }>
}): ReportData {
  const fmt = (n: number) => formatCurrency(n, params.currency)
  const fmtDate = (d: Date) => format(new Date(d), 'dd MMM yyyy', { locale: idLocale })

  const income = params.summary.income
  const expense = params.summary.expense
  const balance = income - expense
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0

  const categoryTotal = params.categories.reduce((s, c) => s + c.total, 0)
  const categoryTxCount = params.categories.reduce((s, c) => s + c.count, 0)

  return {
    workspace: params.workspaceName,
    currency: params.currency,
    periodStart: fmtDate(params.periodStart),
    periodEnd: fmtDate(params.periodEnd),
    periodLabel: `${fmtDate(params.periodStart)} – ${fmtDate(params.periodEnd)}`,
    generatedAt: format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale }),
    summary: {
      income: fmt(income),
      expense: fmt(expense),
      balance: fmt(balance),
      savingsRate: savingsRate.toString(),
      incomeCount: params.summary.incomeCount,
      expenseCount: params.summary.expenseCount,
    },
    categories: params.categories.map((c) => ({
      name: c.name,
      color: c.color,
      total: fmt(c.total),
      percentage: categoryTotal > 0 ? ((c.total / categoryTotal) * 100).toFixed(1) : '0',
      count: c.count,
    })),
    categoryTotal: fmt(categoryTotal),
    categoryTxCount,
    budgets: params.budgets.map((b) => {
      const pct = b.limit > 0 ? Math.min(Math.round((b.spent / b.limit) * 100), 100) : 0
      const overBudget = b.spent > b.limit
      return {
        name: b.name,
        color: b.color,
        limit: fmt(b.limit),
        spent: fmt(b.spent),
        remaining: fmt(b.limit - b.spent),
        pct: pct.toString(),
        barWidth: pct.toString(),
        statusClass: pct >= 85 ? 'red' : pct >= 60 ? 'yellow' : 'green',
        overBudget,
      }
    }),
    topTransactions: params.topTransactions.map((t) => ({
      date: fmtDate(t.date),
      description: t.description,
      category: t.category,
      type: t.type,
      typeLower: t.type.toLowerCase(),
      amount: fmt(t.amount),
    })),
    transactions: params.transactions.map((t) => ({
      date: fmtDate(t.date),
      description: t.description,
      notes: t.notes ?? undefined,
      category: t.category,
      type: t.type,
      typeLower: t.type.toLowerCase(),
      amount: fmt(t.amount),
    })),
  }
}

export async function generatePdfBuffer(html: string): Promise<Buffer> {
  // Dynamically import puppeteer to avoid edge runtime issues
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
