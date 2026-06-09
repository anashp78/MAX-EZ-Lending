export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const app = await prisma.application.findUnique({
    where: { id },
    select: { aiScore: true },
  })
  return NextResponse.json({ scored: app?.aiScore != null })
}
