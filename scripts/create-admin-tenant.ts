import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fundingos' },
    update: {},
    create: {
      slug: 'fundingos',
      name: 'EZ Lending',
      domain: 'lending.maxevdigital.com',
      isActive: true,
    },
  })
  console.log('Tenant:', tenant.id)

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@ezlending.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@ezlending.com',
      passwordHash: 'EZLending2026!',
      name: 'Platform Admin',
      role: 'admin',
    },
  })
  console.log('Admin user:', user.id)
  console.log('Login: admin@ezlending.com / EZLending2026!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
