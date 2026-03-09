import { NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'currentPassword and newPassword are required' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'newPassword must be at least 8 characters' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })

  if (!user?.passwordHash) {
    return NextResponse.json({ error: 'User not found or has no password' }, { status: 404 })
  }

  const isValid = await bcryptjs.compare(currentPassword, user.passwordHash)
  if (!isValid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const hashedPassword = await bcryptjs.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hashedPassword },
  })

  return NextResponse.json({ message: 'Password updated successfully' })
}
