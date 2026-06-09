import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { analyzeQuestionnaire } from '@/lib/tools/questionnaire-analysis'
import { sendApplicantResultEmail } from '@/lib/email'
import { getIndustryBenchmarks } from '@/lib/tools/snowflake-benchmarks'
import { getSbaHistory } from '@/lib/tools/sba-history'
import { ragSearch } from '@/lib/tools/rag-search'
import { calculateScore } from '@/lib/tools/score-calculator'
import { routeToAffiliate } from '@/lib/tools/affiliate-router'
import { writeToSalesforce } from '@/lib/tools/salesforce-writer'
import type { ApplicationContext, AgentToolCall, AgentRunResult, SseEvent, AffiliateRouteResult, ScoreBreakdown } from '@/types'

let _anthropic: Anthropic | null = null
function getClient() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'questionnaire_analysis',
    description: 'Analyze the applicant financial questionnaire — monthly revenue, expenses, daily balance, NSF history, and credit score range. Returns cash flow metrics shaped for underwriting.',
    input_schema: {
      type: 'object' as const,
      properties: { application_id: { type: 'string' } },
      required: ['application_id'],
    },
  },
  {
    name: 'snowflake_benchmarks',
    description: 'Fetch industry default rates and median loan amounts from Snowflake SBA dataset by NAICS code and state.',
    input_schema: {
      type: 'object' as const,
      properties: {
        naics_code: { type: 'string' },
        state: { type: 'string' },
      },
      required: ['naics_code', 'state'],
    },
  },
  {
    name: 'sba_history_lookup',
    description: 'Look up comparable SBA 7(a) loan outcomes by NAICS, state, and loan amount band from historical data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        naics_code: { type: 'string' },
        state: { type: 'string' },
        loan_amount: { type: 'number' },
      },
      required: ['naics_code', 'state', 'loan_amount'],
    },
  },
  {
    name: 'rag_search',
    description: 'Search SBA guidelines, eligibility criteria, and affiliate lending rules using semantic similarity.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'score_calculator',
    description: 'Calculate structured 0-100 underwriting score across 6 dimensions and produce a routing recommendation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        application_id: { type: 'string' },
        plaid_summary: { type: 'object' },
        benchmark_data: { type: 'object' },
        sba_history: { type: 'object' },
        rag_context: { type: 'object' },
      },
      required: ['application_id', 'plaid_summary', 'benchmark_data', 'sba_history', 'rag_context'],
    },
  },
  {
    name: 'affiliate_router',
    description: 'Route application to Lendio (score >= 70) or Kapitus (score 55-69). Skips if score < 55.',
    input_schema: {
      type: 'object' as const,
      properties: {
        application_id: { type: 'string' },
        score: { type: 'number' },
        recommendation: { type: 'string' },
      },
      required: ['application_id', 'score', 'recommendation'],
    },
  },
  {
    name: 'salesforce_writer',
    description: 'Write lead and opportunity record to Salesforce. ALWAYS the last tool called.',
    input_schema: {
      type: 'object' as const,
      properties: {
        application_id: { type: 'string' },
        score: { type: 'number' },
        recommendation: { type: 'string' },
        affiliate_result: { type: 'object' },
      },
      required: ['application_id', 'score', 'recommendation', 'affiliate_result'],
    },
  },
]

export async function runUnderwritingAgent(
  ctx: ApplicationContext,
  emit: (event: SseEvent) => void
): Promise<AgentRunResult> {
  const runId = crypto.randomUUID()
  const startTime = Date.now()
  const toolCalls: AgentToolCall[] = []

  // Track intermediate results
  let plaidResult: Awaited<ReturnType<typeof analyzeQuestionnaire>> | null = null
  let benchmarkResult: Awaited<ReturnType<typeof getIndustryBenchmarks>> | null = null
  let sbaResult: Awaited<ReturnType<typeof getSbaHistory>> | null = null
  let ragResult: Awaited<ReturnType<typeof ragSearch>> | null = null
  let scoreResult: ReturnType<typeof calculateScore> | null = null
  let affiliateResult: Awaited<ReturnType<typeof routeToAffiliate>> | null = null

  const application = await prisma.application.findUnique({ where: { id: ctx.applicationId }, include: { plaidData: true } })

  const systemPrompt = `You are an AI lending underwriter for MAX EV Business Lending. Your job is to assess a small business loan application and produce a credit decision.

You MUST call these tools in this exact sequence:
1. questionnaire_analysis — analyze the applicant's financial profile
2. snowflake_benchmarks — get industry data
3. sba_history_lookup — get comparable SBA loans
4. rag_search — check guidelines/compliance
5. score_calculator — produce the score
6. affiliate_router — route to partner (or skip if score < 55)
7. salesforce_writer — ALWAYS write to Salesforce last

Do not skip steps. Do not call tools out of order. After salesforce_writer completes, output a brief decision summary.`

  const userMessage = `Underwrite this application:
Business: ${ctx.businessName} (${ctx.businessType})
Applicant: ${ctx.applicantName}
Loan Amount: $${ctx.loanAmount.toLocaleString()}
NAICS: ${ctx.naicsCode || 'unknown'}
State: ${ctx.businessState || 'TX'}
Years in Business: ${ctx.yearsInBusiness || 0}
Annual Revenue: $${ctx.annualRevenue?.toLocaleString() || 'unknown'}
Application ID: ${ctx.applicationId}`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

  // Agent loop
  while (true) {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason !== 'tool_use') break

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      const toolStart = Date.now()
      emit({ type: 'tool_start', tool: block.name })

      let output: Record<string, unknown>
      let error: string | undefined

      try {
        output = await dispatchTool(block.name, block.input as Record<string, unknown>, ctx, application, {
          plaidResult, benchmarkResult, sbaResult, ragResult
        })

        // Cache results for downstream tools
        if (block.name === 'questionnaire_analysis') plaidResult = output as unknown as Awaited<ReturnType<typeof analyzeQuestionnaire>>
        if (block.name === 'snowflake_benchmarks') benchmarkResult = output as unknown as Awaited<ReturnType<typeof getIndustryBenchmarks>>
        if (block.name === 'sba_history_lookup') sbaResult = output as unknown as Awaited<ReturnType<typeof getSbaHistory>>
        if (block.name === 'rag_search') ragResult = output as unknown as Awaited<ReturnType<typeof ragSearch>>
        if (block.name === 'score_calculator') {
          scoreResult = output as unknown as ScoreBreakdown
          emit({ type: 'score', score: output as unknown as ReturnType<typeof calculateScore> })
        }
        if (block.name === 'affiliate_router') {
          affiliateResult = output as unknown as AffiliateRouteResult
          emit({ type: 'affiliate', result: output as unknown as AffiliateRouteResult })
        }
      } catch (err) {
        error = (err as Error).message
        output = { error }
      }

      const durationMs = Date.now() - toolStart
      toolCalls.push({ tool: block.name, input: block.input as Record<string, unknown>, output, durationMs, error })
      emit({ type: 'tool_complete', tool: block.name, durationMs })

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(output),
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  const totalDurationMs = Date.now() - startTime

  // Persist agent run
  await prisma.agentRun.create({
    data: {
      runId,
      applicationId: ctx.applicationId,
      status: scoreResult ? 'completed' : 'failed',
      toolSequence: toolCalls as unknown as Parameters<typeof prisma.agentRun.create>[0]['data']['toolSequence'],
      finalScore: scoreResult?.total,
      finalRec: scoreResult?.recommendation,
      completedAt: new Date(),
      durationMs: totalDurationMs,
    },
  })

  if (scoreResult) {
    await prisma.application.update({
      where: { id: ctx.applicationId },
      data: {
        aiScore: scoreResult.total,
        aiScoreBreakdown: scoreResult as unknown as Parameters<typeof prisma.application.update>[0]['data']['aiScoreBreakdown'],
        aiRecommendation: scoreResult.recommendation,
        affiliateRouted: affiliateResult?.affiliate !== 'none' ? affiliateResult?.affiliate : null,
        affiliateRefId: affiliateResult?.referenceId,
        status: scoreResult.recommendation === 'decline' ? 'declined' :
                scoreResult.recommendation === 'manual_review' ? 'under_review' : 'approved',
      },
    })
  }

  // Fire-and-forget applicant result email
  if (scoreResult) {
    const appForEmail = await prisma.application.findUnique({
      where: { id: ctx.applicationId },
      select: { applicantName: true, applicantEmail: true, id: true, aiScore: true, aiRecommendation: true },
    })
    if (appForEmail) {
      sendApplicantResultEmail({
        ...appForEmail,
        qualifiedAmountMin: scoreResult.qualifiedAmountMin,
        qualifiedAmountMax: scoreResult.qualifiedAmountMax,
      }).catch(() => {})
    }
  }

  emit({ type: 'complete', runId })

  return {
    runId,
    applicationId: ctx.applicationId,
    score: scoreResult!,
    toolCalls,
    totalDurationMs,
    status: scoreResult ? 'completed' : 'failed',
  }
}

async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ApplicationContext,
  application: Record<string, unknown> | null,
  cache: { plaidResult: unknown; benchmarkResult: unknown; sbaResult: unknown; ragResult: unknown }
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'questionnaire_analysis': {
      const result = await analyzeQuestionnaire(ctx.applicationId)
      return result as unknown as Record<string, unknown>
    }
    case 'snowflake_benchmarks': {
      const result = await getIndustryBenchmarks(
        (input.naics_code as string) || ctx.naicsCode || '999999',
        (input.state as string) || ctx.businessState || 'TX'
      )
      return result as unknown as Record<string, unknown>
    }
    case 'sba_history_lookup': {
      const result = await getSbaHistory(
        (input.naics_code as string) || ctx.naicsCode || '999999',
        (input.state as string) || ctx.businessState || 'TX',
        (input.loan_amount as number) || ctx.loanAmount
      )
      return result as unknown as Record<string, unknown>
    }
    case 'rag_search': {
      const result = await ragSearch(input.query as string)
      return result as unknown as Record<string, unknown>
    }
    case 'score_calculator': {
      const result = calculateScore(
        ctx,
        (cache.plaidResult || input.plaid_summary) as Parameters<typeof calculateScore>[1],
        (cache.benchmarkResult || input.benchmark_data) as Parameters<typeof calculateScore>[2],
        (cache.sbaResult || input.sba_history) as Parameters<typeof calculateScore>[3],
        (cache.ragResult || input.rag_context) as Parameters<typeof calculateScore>[4]
      )
      return result as unknown as Record<string, unknown>
    }
    case 'affiliate_router': {
      const score = cache.plaidResult ? calculateScore(
        ctx,
        cache.plaidResult as Parameters<typeof calculateScore>[1],
        cache.benchmarkResult as Parameters<typeof calculateScore>[2],
        cache.sbaResult as Parameters<typeof calculateScore>[3],
        cache.ragResult as Parameters<typeof calculateScore>[4]
      ) : { total: input.score as number, recommendation: input.recommendation as string, cashFlow: 0, creditProxy: 0, businessHistory: 0, industryRisk: 0, loanViability: 0, complianceFlags: 0, reasoning: '' }
      const result = await routeToAffiliate(ctx, score as ReturnType<typeof calculateScore>)
      return result as unknown as Record<string, unknown>
    }
    case 'salesforce_writer': {
      const scoreForSf = cache.plaidResult ? calculateScore(
        ctx,
        cache.plaidResult as Parameters<typeof calculateScore>[1],
        cache.benchmarkResult as Parameters<typeof calculateScore>[2],
        cache.sbaResult as Parameters<typeof calculateScore>[3],
        cache.ragResult as Parameters<typeof calculateScore>[4]
      ) : { total: input.score as number, recommendation: input.recommendation as string, cashFlow: 0, creditProxy: 0, businessHistory: 0, industryRisk: 0, loanViability: 0, complianceFlags: 0, reasoning: '' }
      const result = await writeToSalesforce(ctx, scoreForSf as ReturnType<typeof calculateScore>, (input.affiliate_result || { affiliate: 'none', status: 'skipped', message: 'N/A' }) as Parameters<typeof writeToSalesforce>[2])
      return result as unknown as Record<string, unknown>
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
