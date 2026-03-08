import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentWorkspace } from '@/lib/workspace'
import { z } from 'zod'

const recurringSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.coerce.number().positive(),
  description: z.string().min(1).max(200),
  categoryId: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

function computeNextRunAt(startDate: Date, frequency: string): Date {
  const d = new Date(startDate)
  const now = new Date()
  if (d > now) return d
  switch (frequency) {
    case 'DAILY': d.setDate(now.getDate() + 1); break
    case 'WEEKLY': d.setDate(now.getDate() + 7); break
    case 'BIWEEKLY': d.setDate(now.getDate() + 14); break
    case 'MONTHLY': d.setMonth(now.getMonth() + 1); break
    case 'QUARTERLY': d.setMonth(now.getMonth() + 3); break
    case 'YEARLY': d.setFullYear(now.getFullYear() + 1); break
  }
  return d
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ws = await getCurrentWorkspace()
  if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const rules = await prisma.recurringRule.findMany({
    where: { workspaceId: ws.id },
    include: { category: true, _count: { select: { transactions: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ws = await getCurrentWorkspace()
  if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const body = await req.json()
  const parsed = recurringSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const startDate = new Date(parsed.data.startDate)
  const nextRunAt = computeNextRunAt(startDate, parsed.data.frequency)

  const rule = await prisma.recurringRule.create({
    data: {
      workspaceId: ws.id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      frequency: parsed.data.frequency as any,
      startDate,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      nextRunAt,
    },
    include: { category: true },
  })
  return NextResponse.json(rule, { status: 201 })
}
