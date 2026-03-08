/**
 * Recurring transaction worker — run as standalone process
 * Schedule: daily at 00:01 via cron or BullMQ repeat
 * Usage: npx tsx src/workers/recurring.worker.ts
 */
import 'dotenv/config'
import { Worker, Queue } from 'bullmq'
import { connection, JOB_NAMES } from '@/lib/queue'
import { prisma } from '@/lib/db'
import { addDays, addWeeks, addMonths, addQuarters, addYears } from 'date-fns'

function nextRunDate(frequency: string, from: Date): Date {
  switch (frequency) {
    case 'DAILY':      return addDays(from, 1)
    case 'WEEKLY':     return addWeeks(from, 1)
    case 'BIWEEKLY':   return addWeeks(from, 2)
    case 'MONTHLY':    return addMonths(from, 1)
    case 'QUARTERLY':  return addQuarters(from, 1)
    case 'YEARLY':     return addYears(from, 1)
    default:           return addMonths(from, 1)
  }
}

const recurringQueue = new Queue('recurring', { connection })

const worker = new Worker(
  'recurring',
  async (job) => {
    if (job.name !== JOB_NAMES.PROCESS_RECURRING) return

    const now = new Date()
    const dueRules = await prisma.recurringRule.findMany({
      where: { isActive: true, nextRunAt: { lte: now } },
    })

    console.log(`[recurring-worker] Processing ${dueRules.length} due rules`)

    for (const rule of dueRules) {
      try {
        // Deactivate if past end date
        if (rule.endDate && new Date(rule.endDate) < now) {
          await prisma.recurringRule.update({ where: { id: rule.id }, data: { isActive: false } })
          continue
        }

        // Create transaction from rule
        await prisma.transaction.create({
          data: {
            workspaceId: rule.workspaceId,
            userId: (await prisma.workspaceMember.findFirst({
              where: { workspaceId: rule.workspaceId },
              orderBy: { joinedAt: 'asc' },
            }))!.userId,
            categoryId: rule.categoryId,
            type: rule.type,
            amount: rule.amount,
            currency: 'IDR',
            description: rule.description,
            date: now,
            isRecurring: true,
            recurringRuleId: rule.id,
          },
        })

        // Advance nextRunAt
        const next = nextRunDate(rule.frequency, new Date(rule.nextRunAt))
        await prisma.recurringRule.update({ where: { id: rule.id }, data: { nextRunAt: next } })
      } catch (err) {
        console.error(`[recurring-worker] Failed to process rule ${rule.id}:`, err)
      }
    }
  },
  { connection }
)

// Schedule daily cron job
async function scheduleCron() {
  await recurringQueue.add(
    JOB_NAMES.PROCESS_RECURRING,
    {},
    {
      repeat: { pattern: '1 0 * * *' }, // 00:01 every day
      jobId: 'recurring-cron',
    }
  )
  console.log('[recurring-worker] Cron scheduled at 00:01 daily')
}

scheduleCron().catch(console.error)

worker.on('completed', (job) => console.log(`[recurring-worker] Job ${job.id} completed`))
worker.on('failed', (job, err) => console.error(`[recurring-worker] Job ${job?.id} failed:`, err.message))

console.log('[recurring-worker] Started')
