export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { messages, scoreContext } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    scoreContext: {
      total: number
      recommendation: string
      qualifiedAmountMin: number
      qualifiedAmountMax: number
      cashFlow: number
      creditProxy: number
      businessHistory: number
      industryRisk: number
      loanViability: number
      complianceFlags: number
      reasoning: string
    }
  }

  const rec = scoreContext.recommendation
  const recLabel =
    rec === 'lendio' ? 'Approved — Lendio' :
    rec === 'kapitus' ? 'Approved — Kapitus' :
    rec === 'manual_review' ? 'Manual Review Required' :
    'Not Approved at This Time'

  const systemPrompt = `You are a lending advisor at MAX EV Business Lending. The applicant just completed AI underwriting. Here are their results:

Score: ${scoreContext.total}/100
Decision: ${recLabel}
Pre-qualified range: $${scoreContext.qualifiedAmountMin.toLocaleString()} – $${scoreContext.qualifiedAmountMax.toLocaleString()}

Score breakdown:
- Cash Flow: ${scoreContext.cashFlow}/20
- Business History: ${scoreContext.businessHistory}/20
- Industry Risk: ${scoreContext.industryRisk}/20
- Credit Proxy: ${scoreContext.creditProxy}/15
- Loan Viability: ${scoreContext.loanViability}/15
- Compliance: ${scoreContext.complianceFlags}/10

AI reasoning: ${scoreContext.reasoning}

Your job: help the applicant understand their results, answer questions about the lending process, and give practical advice on improving their score for future applications. Be warm, clear, and encouraging even for declines. Keep responses concise — 2-4 sentences. Never promise specific loan terms, rates, or guarantee approval. If asked about next steps for approved applicants, say a lending specialist will reach out within 1 business day.`

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemPrompt,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
