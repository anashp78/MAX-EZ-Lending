export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTenantFromRequest } from '@/lib/tenant'
import { encrypt } from '@/lib/encryption'
import { z } from 'zod'

const CreateSchema = z.object({
  businessName: z.string().min(1),
  businessType: z.enum(['LLC', 'Corporation', 'Sole Proprietorship', 'Partnership']),
  naicsCode: z.string().optional(),
  businessState: z.string().length(2).optional(),
  yearsInBusiness: z.number().int().min(0).optional(),
  annualRevenue: z.number().positive().optional(),
  employeeCount: z.number().int().min(0).optional(),
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  applicantPhone: z.string().optional(),
  ssn: z.string().regex(/^\d{9}$/).optional(),
  loanAmount: z.number().positive(),
  loanPurpose: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const application = await prisma.application.create({
    data: {
      tenantId: tenant.id,
      userId: session?.user?.id,
      businessName: data.businessName,
      businessType: data.businessType,
      naicsCode: data.naicsCode,
      businessState: data.businessState,
      yearsInBusiness: data.yearsInBusiness,
      annualRevenue: data.annualRevenue,
      employeeCount: data.employeeCount,
      applicantName: data.applicantName,
      applicantEmail: data.applicantEmail,
      applicantPhone: data.applicantPhone,
      ssnEncrypted: data.ssn ? encrypt(data.ssn) : undefined,
      loanAmount: data.loanAmount,
      loanPurpose: data.loanPurpose,
      status: 'draft',
    },
  })

  return NextResponse.json({ applicationId: application.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || '1')
  const perPage = 25

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, businessName: true, applicantName: true, loanAmount: true,
        status: true, aiScore: true, aiRecommendation: true, createdAt: true,
      },
    }),
    prisma.application.count({ where: { tenantId: tenant.id } }),
  ])

  return NextResponse.json({ applications, total, page, perPage })
}
