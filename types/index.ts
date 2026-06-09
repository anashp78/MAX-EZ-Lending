export interface ApplicationContext {
  applicationId: string
  applicantName: string
  businessName: string
  loanAmount: number
  businessType: string
  naicsCode?: string
  businessState?: string
  yearsInBusiness?: number
  annualRevenue?: number
}

export interface PlaidAnalysisResult {
  avgMonthlyDeposits: number
  avgMonthlyWithdrawals: number
  nsfCount: number
  volatilityScore: number
  monthsAnalyzed: number
  cashFlowTrend: 'positive' | 'negative' | 'stable'
  summary: string
}

export interface SnowflakeBenchmark {
  naicsCode: string
  state: string
  industryName: string
  medianLoanAmount: number
  defaultRate: number
  avgApprovalRate: number
  sampleSize: number
}

export interface SbaHistoryResult {
  comparableLoans: number
  approvalRate: number
  avgLoanAmount: number
  medianLoanAmount: number
  defaultRate: number
  topLenders: string[]
}

export interface RagSearchResult {
  chunks: Array<{
    content: string
    source: string
    similarity: number
  }>
  summary: string
}

export interface ScoreBreakdown {
  cashFlow: number         // 0-20
  creditProxy: number      // 0-15
  businessHistory: number  // 0-20
  industryRisk: number     // 0-20
  loanViability: number    // 0-15
  complianceFlags: number  // 0-10
  total: number            // 0-100
  recommendation: 'lendio' | 'kapitus' | 'manual_review' | 'decline'
  reasoning: string
  qualifiedAmountMin: number
  qualifiedAmountMax: number
}

export interface AffiliateRouteResult {
  affiliate: 'lendio' | 'kapitus' | 'none'
  referenceId?: string
  status: 'submitted' | 'rejected' | 'skipped'
  message: string
}

export interface SalesforceWriteResult {
  leadId?: string
  opportunityId?: string
  status: 'created' | 'updated' | 'failed'
  message: string
}

export interface AgentToolCall {
  tool: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  durationMs: number
  error?: string
}

export interface AgentRunResult {
  runId: string
  applicationId: string
  score: ScoreBreakdown
  toolCalls: AgentToolCall[]
  totalDurationMs: number
  status: 'completed' | 'failed'
}

export type SseEvent =
  | { type: 'tool_start'; tool: string }
  | { type: 'tool_complete'; tool: string; durationMs: number }
  | { type: 'score'; score: ScoreBreakdown }
  | { type: 'affiliate'; result: AffiliateRouteResult }
  | { type: 'complete'; runId: string }
  | { type: 'error'; message: string }
