import { prisma } from '@/lib/db'
import type { PlaidAnalysisResult } from '@/types'

const NSF_MAP: Record<string, number> = {
  '0': 0,
  '1-3': 2,
  '4-10': 7,
  '10+': 12,
}

const CREDIT_VOLATILITY: Record<string, number> = {
  '720_plus': 0.05,
  '680_719': 0.10,
  '620_679': 0.20,
  '580_619': 0.35,
  'below_580': 0.50,
}

export async function analyzeQuestionnaire(applicationId: string): Promise<PlaidAnalysisResult> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      monthlyRevenue: true,
      avgDailyBalance: true,
      monthlyExpenses: true,
      outstandingDebt: true,
      nsfRange: true,
      creditScoreRange: true,
    },
  })

  const monthly = app?.monthlyRevenue ?? 10000
  const expenses = app?.monthlyExpenses ?? monthly * 0.75
  const balance = app?.avgDailyBalance ?? monthly * 0.4
  const nsfCount = NSF_MAP[app?.nsfRange ?? '0'] ?? 0

  const netMargin = (monthly - expenses) / Math.max(monthly, 1)
  const cashFlowTrend: PlaidAnalysisResult['cashFlowTrend'] =
    netMargin > 0.2 ? 'positive' : netMargin < 0 ? 'negative' : 'stable'

  // Volatility driven by credit score range, adjusted by balance cushion
  const creditVol = CREDIT_VOLATILITY[app?.creditScoreRange ?? '620_679'] ?? 0.2
  const balanceVol = balance > monthly ? 0 : (1 - Math.min(1, balance / monthly)) * 0.15
  const volatilityScore = Math.min(1, creditVol + balanceVol)

  return {
    avgMonthlyDeposits: monthly,
    avgMonthlyWithdrawals: expenses,
    nsfCount,
    volatilityScore,
    monthsAnalyzed: 12,
    cashFlowTrend,
    summary: `Financial profile: $${monthly.toLocaleString()}/mo revenue, $${expenses.toLocaleString()}/mo expenses, ${nsfCount} NSF events (${app?.nsfRange ?? '0'}), credit ${app?.creditScoreRange?.replace(/_/g, ' ') ?? 'unknown'}, daily balance ~$${balance.toLocaleString()}.`,
  }
}
