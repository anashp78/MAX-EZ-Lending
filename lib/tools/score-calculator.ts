import type {
  PlaidAnalysisResult,
  SnowflakeBenchmark,
  SbaHistoryResult,
  RagSearchResult,
  ScoreBreakdown,
  ApplicationContext,
} from '@/types'

export function calculateScore(
  ctx: ApplicationContext,
  plaid: PlaidAnalysisResult,
  benchmark: SnowflakeBenchmark,
  sbaHistory: SbaHistoryResult,
  rag: RagSearchResult
): ScoreBreakdown {
  // 1. Cash Flow (0-20)
  const dscr = plaid.avgMonthlyDeposits / Math.max(ctx.loanAmount / 60, 1)
  const nsfPenalty = Math.min(plaid.nsfCount * 2, 10)
  const trendBonus = plaid.cashFlowTrend === 'positive' ? 3 : plaid.cashFlowTrend === 'negative' ? -3 : 0
  const cashFlow = Math.max(0, Math.min(20, Math.round(dscr > 1.5 ? 18 : dscr > 1.2 ? 14 : dscr > 1.0 ? 10 : 5) - nsfPenalty + trendBonus))

  // 2. Credit Proxy (0-15) — inferred from NSF frequency + revenue consistency
  const volatilityPenalty = Math.round(plaid.volatilityScore * 10)
  const creditProxy = Math.max(0, Math.min(15, 13 - nsfPenalty / 2 - volatilityPenalty))

  // 3. Business History (0-20)
  const years = ctx.yearsInBusiness || 0
  const businessHistory = Math.min(20, Math.round(years >= 5 ? 18 : years >= 3 ? 14 : years >= 2 ? 10 : years >= 1 ? 6 : 2))

  // 4. Industry Risk (0-20) — from Snowflake benchmark
  const defaultRisk = Math.max(0, Math.min(20, Math.round((1 - benchmark.defaultRate) * 20)))
  const industryRisk = defaultRisk

  // 5. Loan Viability (0-15) — loan size vs benchmarks + SBA history
  const loanVsMedian = ctx.loanAmount / Math.max(benchmark.medianLoanAmount, 1)
  const viabilityBase = loanVsMedian < 2 ? 13 : loanVsMedian < 3 ? 9 : 5
  const approvalBonus = sbaHistory.approvalRate > 0.6 ? 2 : 0
  const loanViability = Math.min(15, viabilityBase + approvalBonus)

  // 6. Compliance Flags (0-10) — from RAG guidelines
  const hasRiskyKeywords = rag.summary.toLowerCase().match(/ineligible|prohibited|excluded|restrict/)
  const complianceFlags = hasRiskyKeywords ? 4 : 8

  const total = cashFlow + creditProxy + businessHistory + industryRisk + loanViability + complianceFlags

  const recommendation =
    total >= 70 ? 'lendio' :
    total >= 55 ? 'kapitus' :
    total >= 40 ? 'manual_review' :
    'decline'

  const reasoning = `Score ${total}/100. Cash flow DSCR ${dscr.toFixed(2)} (${cashFlow}/20), business age ${years}yr (${businessHistory}/20), industry default rate ${(benchmark.defaultRate * 100).toFixed(1)}% (${industryRisk}/20), loan viability (${loanViability}/15), compliance (${complianceFlags}/10). Recommendation: ${recommendation.toUpperCase()}.`

  return { cashFlow, creditProxy, businessHistory, industryRisk, loanViability, complianceFlags, total, recommendation, reasoning }
}
