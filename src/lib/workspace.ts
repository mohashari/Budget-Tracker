import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function getCurrentWorkspace() {
  const session = await auth()
  if (!session?.user?.id) return null

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { joinedAt: 'asc' },
  })

  if (!membership) return null

  return {
    ...membership.workspace,
    role: membership.role,
    userId: session.user.id,
  }
}

export async function requireWorkspace() {
  const ws = await getCurrentWorkspace()
  if (!ws) throw new Error('No workspace found')
  return ws
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: 'asc' },
  })
  return memberships.map((m) => ({ ...m.workspace, role: m.role }))
}
