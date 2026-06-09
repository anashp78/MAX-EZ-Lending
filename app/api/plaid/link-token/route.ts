export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { createLinkToken } from '@/lib/tools/plaid-analysis'

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const linkToken = await createLinkToken(userId)
    return NextResponse.json({ linkToken })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
