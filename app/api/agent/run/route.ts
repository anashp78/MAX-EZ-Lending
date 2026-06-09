export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runUnderwritingAgent } from '@/lib/agent/runner'
import type { ApplicationContext, SseEvent } from '@/types'

// POST /api/agent/run — kicks off async agent, returns runId immediately
export async function POST(req: NextRequest) {
  const { applicationId } = await req.json()
  if (!applicationId) return NextResponse.json({ error: 'applicationId required' }, { status: 400 })

  const application = await prisma.application.findUnique({ where: { id: applicationId } })
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const ctx: ApplicationContext = {
    applicationId: application.id,
    applicantName: application.applicantName || 'Applicant',
    businessName: application.businessName || 'Unknown Business',
    loanAmount: application.loanAmount || 0,
    businessType: application.businessType || 'LLC',
    naicsCode: application.naicsCode || undefined,
    businessState: application.businessState || 'TX',
    yearsInBusiness: application.yearsInBusiness || undefined,
    annualRevenue: application.annualRevenue || undefined,
  }

  // Update status to under_review
  await prisma.application.update({ where: { id: applicationId }, data: { status: 'under_review', submittedAt: new Date() } })

  // Fire async — no await
  runUnderwritingAgent(ctx, () => {}).catch(console.error)

  return NextResponse.json({ status: 'started', applicationId })
}

// GET /api/agent/run?applicationId=xxx — SSE stream of agent events
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const applicationId = searchParams.get('applicationId')
  if (!applicationId) return NextResponse.json({ error: 'applicationId required' }, { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const application = await prisma.application.findUnique({ where: { id: applicationId }, include: { plaidData: true } })
        if (!application) {
          send({ type: 'error', message: 'Application not found' })
          controller.close()
          return
        }

        const ctx: ApplicationContext = {
          applicationId: application.id,
          applicantName: application.applicantName || 'Applicant',
          businessName: application.businessName || 'Unknown Business',
          loanAmount: application.loanAmount || 0,
          businessType: application.businessType || 'LLC',
          naicsCode: application.naicsCode || undefined,
          businessState: application.businessState || 'TX',
          yearsInBusiness: application.yearsInBusiness || undefined,
          annualRevenue: application.annualRevenue || undefined,
        }

        await runUnderwritingAgent(ctx, send)
      } catch (err) {
        send({ type: 'error', message: (err as Error).message })
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
