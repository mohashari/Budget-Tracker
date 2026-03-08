import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { DEFAULT_CATEGORIES } from '../src/lib/seed-data'
import * as dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create a test user and workspace if none exist
  let user = await prisma.user.findFirst()
  if (!user) {
    const { hash } = await import('bcryptjs')
    user = await prisma.user.create({
      data: {
        email: 'demo@example.com',
        name: 'Demo User',
        passwordHash: await hash('password123', 12),
      },
    })
    console.log('Created demo user: demo@example.com / password123')

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Personal Finance',
        currency: 'IDR',
        members: { create: { userId: user.id, role: 'OWNER' } },
      },
    })
    console.log('Created workspace:', workspace.name)

    // Seed default categories
    for (const cat of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { workspaceId_name: { workspaceId: workspace.id, name: cat.name } },
        create: { ...cat, workspaceId: workspace.id },
        update: {},
      })
    }
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories`)
  } else {
    console.log('Users already exist, skipping seed')
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
