export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a friendly lending advisor for MAX EV Business Lending. Your job is to pre-qualify small business owners for loans through a natural, conversational exchange.

Your goal: gather 4 pieces of info in a warm, concise way, then give a pre-qualification estimate.
1. Monthly revenue
2. Years in business
3. Estimated credit score range (below 580 / 580-619 / 620-679 / 680-719 / 720+)
4. How much funding they need

Rules:
- Ask ONE question at a time. Never stack questions.
- Be warm and brief. Max 2 sentences per response.
- After gathering all 4 data points, give a soft pre-qual estimate:
  * Revenue $10K+/mo, 2+ years, 620+ credit → "$50,000 - $150,000 range"
  * Revenue $5K-$10K/mo or <2 years → "$25,000 - $75,000 range"
  * Credit below 620 → "a manual review path"
  * Adjust ranges sensibly based on what they tell you.
- After giving the estimate, say: "Want to run the full AI analysis and get your official score? It takes about 4 minutes."
- Never ask for SSN, full bank account numbers, or other sensitive data.
- If asked about rates or specific terms, say those are set by the lending partner after approval.`

export async function POST(req: NextRequest) {
  const { messages } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
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
