import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentWorkspace } from '@/lib/workspace'

const updateRoleSchema = z.object({
  role: z.enum(['MEMBER', 'VIEWER']),
})

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const workspace = await getCurrentWorkspace()
    if (!workspace) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (workspace.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only OWNER can remove members' }, { status: 403 })
    }

    const { memberId } = params

    if (memberId === workspace.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: memberId } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: memberId } },
    })

    return NextResponse.json({ message: 'Member removed' })
  } catch (err) {
    console.error('DELETE /api/workspaces/members/[memberId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const workspace = await getCurrentWorkspace()
    if (!workspace) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (workspace.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only OWNER can change roles' }, { status: 403 })
    }

    const { memberId } = params
    const body = await req.json()
    const parsed = updateRoleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: memberId } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: memberId } },
      data: { role: parsed.data.role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PUT /api/workspaces/members/[memberId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
