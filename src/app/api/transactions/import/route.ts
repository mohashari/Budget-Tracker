import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWorkspace } from '@/lib/workspace'
import { invalidateWorkspaceCache } from '@/lib/redis'
import { z } from 'zod'

const rowSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  categoryId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(10000),
  skipDuplicates: z.boolean().optional().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const ws = await requireWorkspace()
    const body = await req.json()
    const parsed = importSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { rows, skipDuplicates } = parsed.data
    let inserted = 0
    let skipped = 0
    const errors: { row: number; error: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const date = new Date(row.date)
        if (isNaN(date.getTime())) throw new Error('Invalid date')

        if (skipDuplicates) {
          const existing = await prisma.transaction.findFirst({
            where: {
              workspaceId: ws.id,
              date,
              description: row.description,
              amount: row.amount,
            },
          })
          if (existing) { skipped++; continue }
        }

        await prisma.transaction.create({
          data: {
            workspaceId: ws.id,
            userId: ws.userId,
            date,
            description: row.description,
            amount: row.amount,
            type: row.type,
            currency: 'IDR',
            categoryId: row.categoryId || null,
            notes: row.notes || null,
            tags: row.tags || [],
          },
        })
        inserted++
      } catch (err: unknown) {
        errors.push({ row: i + 1, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    await invalidateWorkspaceCache(ws.id)

    return NextResponse.json({
      data: { inserted, skipped, errors, total: rows.length },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
