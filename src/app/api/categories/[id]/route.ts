import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { categorySchema } from '@/lib/validations/category'
import { getCurrentWorkspace } from '@/lib/workspace'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ws = await getCurrentWorkspace()
  if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const body = await req.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const existing = await prisma.category.findFirst({ where: { id, workspaceId: ws.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.category.update({ where: { id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ws = await getCurrentWorkspace()
  if (!ws) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const count = await prisma.transaction.count({ where: { categoryId: id, workspaceId: ws.id } })
  if (count > 0) return NextResponse.json({ error: 'Category has transactions, cannot delete' }, { status: 409 })

  await prisma.category.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
