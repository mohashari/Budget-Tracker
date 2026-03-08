/**
 * Notification worker — run as standalone process
 * Usage: npx tsx src/workers/notification.worker.ts
 */
import 'dotenv/config'
import { Worker } from 'bullmq'
import nodemailer from 'nodemailer'
import { connection, JOB_NAMES } from '@/lib/queue'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/currency'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
  from: process.env.SMTP_FROM || 'noreply@budget-tracker.local',
})

const worker = new Worker(
  'notifications',
  async (job) => {
    if (job.name === JOB_NAMES.BUDGET_ALERT) {
      const { workspaceId, categoryId, categoryName, spent, limit, alertAt, userEmails, currency } = job.data

      const pct = Math.round((spent / limit) * 100)
      const fmt = (n: number) => formatCurrency(n, currency)

      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#ef4444;margin-bottom:8px">⚠️ Peringatan Budget</h2>
          <p style="color:#374151;margin-bottom:16px">
            Budget kategori <strong>${categoryName}</strong> telah mencapai <strong>${pct}%</strong> dari batas yang ditetapkan.
          </p>
          <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="color:#6b7280">Terpakai</span>
              <strong style="color:#dc2626">${fmt(spent)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="color:#6b7280">Batas Budget</span>
              <strong>${fmt(limit)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:#6b7280">Sisa</span>
              <strong style="color:${limit - spent < 0 ? '#dc2626' : '#16a34a'}">${fmt(limit - spent)}</strong>
            </div>
          </div>
          <p style="color:#6b7280;font-size:13px">
            Masuk ke <a href="${process.env.NEXTAUTH_URL}/budget" style="color:#6366f1">Budget Tracker</a> untuk melihat detail.
          </p>
        </div>
      `

      for (const email of userEmails) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@budget-tracker.local',
          to: email,
          subject: `⚠️ Budget "${categoryName}" telah ${pct}% terpakai`,
          html,
        })
      }
    }
  },
  { connection }
)

worker.on('completed', (job) => console.log(`[notification-worker] Job ${job.id} completed`))
worker.on('failed', (job, err) => console.error(`[notification-worker] Job ${job?.id} failed:`, err.message))

console.log('[notification-worker] Started, waiting for jobs...')
