import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentWorkspace } from '@/lib/workspace'

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace()
    if (!workspace) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (workspace.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return NextResponse.json(members)
  } catch (err) {
    console.error('GET /api/workspaces/members error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
