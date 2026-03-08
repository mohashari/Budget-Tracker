import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWorkspace } from '@/lib/workspace'
import { getPresignedDownloadUrl } from '@/lib/s3'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ws = await requireWorkspace()
    const { id } = await params
    const report = await prisma.report.findFirst({ where: { id, workspaceId: ws.id } })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (report.status !== 'DONE' || !report.fileUrl) {
      return NextResponse.json({ error: 'Report not ready' }, { status: 422 })
    }

    const url = await getPresignedDownloadUrl(report.fileUrl, 86400)
    return NextResponse.json({ data: { url } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
