import { Connection } from 'jsforce'
import type { ApplicationContext, ScoreBreakdown, AffiliateRouteResult, SalesforceWriteResult } from '@/types'

let sfConnection: Connection | null = null

async function getSfConnection(): Promise<Connection> {
  if (sfConnection) return sfConnection

  const conn = new Connection({
    loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
  })
  await conn.login(process.env.SF_USERNAME!, process.env.SF_PASSWORD! + (process.env.SF_SECURITY_TOKEN || ''))
  sfConnection = conn
  return conn
}

export async function writeToSalesforce(
  ctx: ApplicationContext,
  score: ScoreBreakdown,
  affiliate: AffiliateRouteResult
): Promise<SalesforceWriteResult> {
  if (!process.env.SF_USERNAME) {
    return {
      leadId: `MOCK-SF-LEAD-${Date.now()}`,
      status: 'created',
      message: 'Mock Salesforce write (no credentials configured)',
    }
  }

  try {
    const conn = await getSfConnection()

    const leadRes = await conn.sobject('Lead').create({
      FirstName: ctx.applicantName.split(' ')[0] || '',
      LastName: ctx.applicantName.split(' ').slice(1).join(' ') || ctx.applicantName,
      Company: ctx.businessName,
      LeadSource: 'EZ Lending Platform',
      Status: score.recommendation === 'decline' ? 'Unqualified' : 'Open',
      Description: score.reasoning,
      Rating: score.total >= 70 ? 'Hot' : score.total >= 55 ? 'Warm' : 'Cold',
    } as Record<string, unknown>)

    const leadId = (leadRes as { id?: string }).id

    let oppId: string | undefined
    if (score.total >= 55 && leadId) {
      const oppRes = await conn.sobject('Opportunity').create({
        Name: `${ctx.businessName} — $${ctx.loanAmount.toLocaleString()} Loan`,
        StageName: score.recommendation === 'lendio' ? 'Submitted to Lendio' : 'Submitted to Kapitus',
        CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        Amount: ctx.loanAmount,
        LeadSource: 'EZ Lending Platform',
      } as Record<string, unknown>)
      oppId = (oppRes as { id?: string }).id
    }

    return { leadId, opportunityId: oppId, status: 'created', message: 'Lead created in Salesforce.' }
  } catch (err) {
    sfConnection = null
    return { status: 'failed', message: `Salesforce error: ${(err as Error).message}` }
  }
}
