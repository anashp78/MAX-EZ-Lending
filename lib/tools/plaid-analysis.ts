import { PlaidApi, Configuration, PlaidEnvironments, Products, CountryCode } from 'plaid'
import { decrypt } from '@/lib/encryption'
import type { PlaidAnalysisResult } from '@/types'

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
)

export async function createLinkToken(userId: string) {
  const res = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'EZ Lending',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  })
  return res.data.link_token
}

export async function exchangePublicToken(publicToken: string) {
  const res = await plaidClient.itemPublicTokenExchange({ public_token: publicToken })
  return res.data.access_token
}

export async function analyzePlaidData(encryptedAccessToken: string): Promise<PlaidAnalysisResult> {
  const accessToken = decrypt(encryptedAccessToken)
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const txRes = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 500 },
  })

  const transactions = txRes.data.transactions
  const months: Record<string, { deposits: number; withdrawals: number }> = {}

  for (const tx of transactions) {
    const month = tx.date.substring(0, 7)
    if (!months[month]) months[month] = { deposits: 0, withdrawals: 0 }
    if (tx.amount < 0) {
      months[month].deposits += Math.abs(tx.amount)
    } else {
      months[month].withdrawals += tx.amount
    }
  }

  const monthValues = Object.values(months)
  const monthsAnalyzed = monthValues.length

  const avgMonthlyDeposits = monthValues.reduce((s, m) => s + m.deposits, 0) / Math.max(monthsAnalyzed, 1)
  const avgMonthlyWithdrawals = monthValues.reduce((s, m) => s + m.withdrawals, 0) / Math.max(monthsAnalyzed, 1)

  const nsfCount = transactions.filter(tx =>
    tx.name?.toLowerCase().includes('nsf') || tx.name?.toLowerCase().includes('insufficient')
  ).length

  const depositValues = monthValues.map(m => m.deposits)
  const mean = avgMonthlyDeposits
  const variance = depositValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(depositValues.length, 1)
  const volatilityScore = Math.min(Math.sqrt(variance) / Math.max(mean, 1), 1)

  const recentDeposits = monthValues.slice(-3).reduce((s, m) => s + m.deposits, 0) / 3
  const olderDeposits = monthValues.slice(0, 3).reduce((s, m) => s + m.deposits, 0) / 3
  const cashFlowTrend = recentDeposits > olderDeposits * 1.05 ? 'positive' : recentDeposits < olderDeposits * 0.95 ? 'negative' : 'stable'

  return {
    avgMonthlyDeposits,
    avgMonthlyWithdrawals,
    nsfCount,
    volatilityScore,
    monthsAnalyzed,
    cashFlowTrend,
    summary: `Analyzed ${monthsAnalyzed} months. Avg deposits: $${avgMonthlyDeposits.toFixed(0)}/mo, withdrawals: $${avgMonthlyWithdrawals.toFixed(0)}/mo. NSF events: ${nsfCount}. Cash flow: ${cashFlowTrend}.`,
  }
}
