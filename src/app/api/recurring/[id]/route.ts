import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentWorkspace } from '@/lib/workspace'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ws = await getCurrentWorkspace()
  if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const existing = await prisma.recurringRule.findFirst({ where: { id, workspaceId: ws.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.recurringRule.update({
    where: { id },
    data: {
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      amount: body.amount ? Number(body.amount) : existing.amount,
      description: body.description ?? existing.description,
    },
    include: { category: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ws = await getCurrentWorkspace()
  if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const existing = await prisma.recurringRule.findFirst({ where: { id, workspaceId: ws.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.recurringRule.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
