import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserWorkspaces } from '@/lib/workspace'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, avatar: true, currency: true, timezone: true, createdAt: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const workspaces = await getUserWorkspaces(session.user.id)

  return NextResponse.json({ ...user, workspaces })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, currency, timezone } = body

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, currency, timezone },
    select: { id: true, name: true, email: true, currency: true, timezone: true },
  })
  return NextResponse.json(updated)
}
