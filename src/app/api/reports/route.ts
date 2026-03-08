import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWorkspace } from '@/lib/workspace'
import { reportsQueue, JOB_NAMES } from '@/lib/queue'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['PDF', 'CSV']),
  periodStart: z.string(),
  periodEnd: z.string(),
  filters: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(_req: NextRequest) {
  try {
    const ws = await requireWorkspace()
    const reports = await prisma.report.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ data: reports })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ws = await requireWorkspace()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { type, periodStart, periodEnd, filters } = parsed.data

    const report = await prisma.report.create({
      data: {
        workspaceId: ws.id,
        userId: ws.userId,
        type,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        filters: (filters ?? {}) as object,
        status: 'PENDING',
      },
    })

    const jobName = type === 'PDF' ? JOB_NAMES.GENERATE_PDF : JOB_NAMES.GENERATE_CSV
    await reportsQueue.add(jobName, { reportId: report.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    })

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
