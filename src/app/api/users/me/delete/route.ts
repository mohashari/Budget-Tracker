import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  // Fetch user with password hash to verify
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.passwordHash) {
    return NextResponse.json({ error: 'Cannot delete account: no password set (OAuth account)' }, { status: 400 })
  }

  const passwordValid = await bcrypt.compare(body.password, user.passwordHash)
  if (!passwordValid) {
    return NextResponse.json({ error: 'Password tidak valid' }, { status: 401 })
  }

  // Delete user and all associated data in a transaction
  // Cascade deletes handle: WorkspaceMember, Account, Session (via onDelete: Cascade on User)
  // Workspaces where user is OWNER must be deleted explicitly first (no cascade from User to Workspace)
  await prisma.$transaction(async (tx) => {
    // Find workspaces where user is the OWNER
    const ownedMemberships = await tx.workspaceMember.findMany({
      where: { userId, role: 'OWNER' },
      select: { workspaceId: true },
    })

    const ownedWorkspaceIds = ownedMemberships.map((m) => m.workspaceId)

    // Delete owned workspaces (cascades to categories, transactions, budgets, recurringRules, reports, workspaceMembers)
    if (ownedWorkspaceIds.length > 0) {
      await tx.workspace.deleteMany({
        where: { id: { in: ownedWorkspaceIds } },
      })
    }

    // Delete the user record (cascades to WorkspaceMember, Account, Session, and unlinks transactions/reports)
    await tx.user.delete({
      where: { id: userId },
    })
  })

  return NextResponse.json({ success: true })
}
