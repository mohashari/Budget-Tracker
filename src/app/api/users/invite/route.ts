import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentWorkspace } from '@/lib/workspace'

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['MEMBER', 'VIEWER']).default('MEMBER'),
})

export async function POST(req: NextRequest) {
  try {
    const workspace = await getCurrentWorkspace()
    if (!workspace) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (workspace.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only OWNER can invite members' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { email, role } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ error: 'User with this email does not exist' }, { status: 404 })
    }

    const membership = await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: { role },
      create: { workspaceId: workspace.id, userId: user.id, role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ message: 'User invited successfully', member: membership }, { status: 201 })
  } catch (err) {
    console.error('POST /api/users/invite error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
