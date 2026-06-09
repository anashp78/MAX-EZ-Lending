import { headers } from 'next/headers'
import { prisma } from '@/lib/db'

export async function getTenantFromRequest() {
  const headersList = await headers()
  const host = headersList.get('host') || ''

  // Strip port
  const hostname = host.split(':')[0]

  // Try exact domain match first (custom domain)
  let tenant = await prisma.tenant.findFirst({
    where: { domain: hostname, isActive: true },
  })
  if (tenant) return tenant

  // Try subdomain match (e.g. acme.lending.maxevdigital.com → slug "acme")
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    const slug = parts[0]
    tenant = await prisma.tenant.findFirst({
      where: { slug, isActive: true },
    })
    if (tenant) return tenant
  }

  // Fall back to default tenant
  return prisma.tenant.findFirst({
    where: { slug: process.env.TENANT_DEFAULT_SLUG || 'fundingos', isActive: true },
  })
}
