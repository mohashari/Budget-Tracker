import { Queue } from 'bullmq'
import { redis } from '@/lib/redis'

// BullMQ requires a connection object, not the ioredis instance directly
const connection = {
  host: (() => {
    try {
      const url = new URL(process.env.REDIS_URL || 'redis://localhost:6381')
      return url.hostname
    } catch {
      return 'localhost'
    }
  })(),
  port: (() => {
    try {
      const url = new URL(process.env.REDIS_URL || 'redis://localhost:6381')
      return parseInt(url.port) || 6379
    } catch {
      return 6379
    }
  })(),
}

export const reportsQueue = new Queue('reports', { connection })
export const notificationsQueue = new Queue('notifications', { connection })
export const recurringQueue = new Queue('recurring', { connection })

export const JOB_NAMES = {
  GENERATE_PDF: 'generate-pdf',
  GENERATE_CSV: 'generate-csv',
  BUDGET_ALERT: 'budget-alert',
  PROCESS_RECURRING: 'process-recurring',
  EXPIRE_REPORTS: 'expire-reports',
} as const

// Re-export redis for worker connection reuse
export { redis, connection }
