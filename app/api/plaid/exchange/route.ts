export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { exchangePublicToken } from '@/lib/tools/plaid-analysis'
import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { publicToken, applicationId } = await req.json()
  if (!publicToken || !applicationId) {
    return NextResponse.json({ error: 'publicToken and applicationId required' }, { status: 400 })
  }

  const accessToken = await exchangePublicToken(publicToken)
  const accessTokenEnc = encrypt(accessToken)

  await prisma.plaidData.upsert({
    where: { applicationId },
    create: { applicationId, accessTokenEnc },
    update: { accessTokenEnc },
  })

  return NextResponse.json({ status: 'linked' })
}
