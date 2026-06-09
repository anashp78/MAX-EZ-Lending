import snowflake from 'snowflake-sdk'
import type { SnowflakeBenchmark } from '@/types'

let connectionPool: snowflake.Connection | null = null

async function getConnection(): Promise<snowflake.Connection> {
  if (connectionPool) return connectionPool

  return new Promise((resolve, reject) => {
    const conn = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USERNAME!,
      password: process.env.SNOWFLAKE_PASSWORD!,
      database: process.env.SNOWFLAKE_DATABASE!,
      schema: process.env.SNOWFLAKE_SCHEMA!,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
      role: process.env.SNOWFLAKE_ROLE,
    })
    conn.connect((err, c) => {
      if (err) return reject(err)
      connectionPool = c
      resolve(c)
    })
  })
}

export async function query<T>(sql: string, binds: unknown[] = []): Promise<T[]> {
  const conn = await getConnection()
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds: binds as snowflake.Bind[],
      complete: (err, _stmt, rows) => {
        if (err) return reject(err)
        resolve((rows || []) as T[])
      },
    })
  })
}

export async function getIndustryBenchmarks(naicsCode: string, state: string): Promise<SnowflakeBenchmark> {
  // Try exact NAICS + state match, fall back to NAICS-only, then industry group
  const rows = await query<Record<string, unknown>>(
    `SELECT
       NAICS_CODE, STATE, INDUSTRY_NAME,
       MEDIAN_LOAN_AMOUNT, DEFAULT_RATE, APPROVAL_RATE, SAMPLE_SIZE
     FROM LOAN_BENCHMARKS
     WHERE NAICS_CODE = ?
       AND (STATE = ? OR STATE = 'ALL')
     ORDER BY CASE WHEN STATE = ? THEN 0 ELSE 1 END
     LIMIT 1`,
    [naicsCode, state, state]
  )

  if (rows.length === 0) {
    // Industry group fallback (first 2 digits)
    const groupRows = await query<Record<string, unknown>>(
      `SELECT
         NAICS_CODE, STATE, INDUSTRY_NAME,
         MEDIAN_LOAN_AMOUNT, DEFAULT_RATE, APPROVAL_RATE, SAMPLE_SIZE
       FROM LOAN_BENCHMARKS
       WHERE LEFT(NAICS_CODE, 2) = ?
         AND STATE = 'ALL'
       LIMIT 1`,
      [naicsCode.substring(0, 2)]
    )
    if (groupRows.length === 0) {
      return { naicsCode, state, industryName: 'Unknown', medianLoanAmount: 150000, defaultRate: 0.05, avgApprovalRate: 0.5, sampleSize: 0 }
    }
    return mapRow(groupRows[0])
  }

  return mapRow(rows[0])
}

function mapRow(row: Record<string, unknown>): SnowflakeBenchmark {
  return {
    naicsCode: String(row.NAICS_CODE || ''),
    state: String(row.STATE || ''),
    industryName: String(row.INDUSTRY_NAME || ''),
    medianLoanAmount: Number(row.MEDIAN_LOAN_AMOUNT || 0),
    defaultRate: Number(row.DEFAULT_RATE || 0),
    avgApprovalRate: Number(row.APPROVAL_RATE || 0),
    sampleSize: Number(row.SAMPLE_SIZE || 0),
  }
}
