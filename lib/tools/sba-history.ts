import { query as snowflakeQuery } from './snowflake-benchmarks'
import type { SbaHistoryResult } from '@/types'

export async function getSbaHistory(naicsCode: string, state: string, loanAmount: number): Promise<SbaHistoryResult> {
  const amountBand = loanAmount <= 150000 ? 'MICRO' : loanAmount <= 500000 ? 'SMALL' : loanAmount <= 2000000 ? 'MEDIUM' : 'LARGE'

  const rows = await snowflakeQuery<Record<string, unknown>>(
    `SELECT
       COUNT(*) AS COMPARABLE_LOANS,
       AVG(CASE WHEN LOAN_STATUS IN ('PAID IN FULL','EXEMPT') THEN 1.0 ELSE 0.0 END) AS APPROVAL_RATE,
       AVG(GROSS_APPROVAL) AS AVG_LOAN_AMOUNT,
       MEDIAN(GROSS_APPROVAL) AS MEDIAN_LOAN_AMOUNT,
       AVG(CASE WHEN LOAN_STATUS = 'CHARGED OFF' THEN 1.0 ELSE 0.0 END) AS DEFAULT_RATE,
       ARRAY_AGG(DISTINCT BANK_NAME) WITHIN GROUP (ORDER BY BANK_NAME) AS TOP_LENDERS
     FROM LOAN_HISTORY
     WHERE LEFT(NAICS_CODE, ${naicsCode.length}) = ?
       AND BOR_STATE = ?
       AND AMOUNT_BAND = ?
     LIMIT 1`,
    [naicsCode, state, amountBand]
  )

  if (!rows.length || !rows[0].COMPARABLE_LOANS) {
    return {
      comparableLoans: 0,
      approvalRate: 0.5,
      avgLoanAmount: loanAmount,
      medianLoanAmount: loanAmount,
      defaultRate: 0.05,
      topLenders: [],
    }
  }

  const row = rows[0]
  const lenders = Array.isArray(row.TOP_LENDERS)
    ? (row.TOP_LENDERS as string[]).slice(0, 5)
    : []

  return {
    comparableLoans: Number(row.COMPARABLE_LOANS),
    approvalRate: Number(row.APPROVAL_RATE),
    avgLoanAmount: Number(row.AVG_LOAN_AMOUNT),
    medianLoanAmount: Number(row.MEDIAN_LOAN_AMOUNT),
    defaultRate: Number(row.DEFAULT_RATE),
    topLenders: lenders,
  }
}
