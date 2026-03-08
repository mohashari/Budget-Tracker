import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWorkspace } from '@/lib/workspace'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    const { id } = await params
    const report = await prisma.report.findFirst({ where: { id, workspaceId: ws.id } })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: report })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    const { id } = await params
    const report = await prisma.report.findFirst({ where: { id, workspaceId: ws.id } })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.report.delete({ where: { id } })
    return NextResponse.json({ data: { deleted: true } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
