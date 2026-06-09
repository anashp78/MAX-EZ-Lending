import type { ScoreBreakdown, AffiliateRouteResult, ApplicationContext } from '@/types'

export async function routeToAffiliate(
  ctx: ApplicationContext,
  score: ScoreBreakdown
): Promise<AffiliateRouteResult> {
  if (score.recommendation === 'lendio') {
    return submitToLendio(ctx, score)
  }
  if (score.recommendation === 'kapitus') {
    return submitToKapitus(ctx, score)
  }
  return { affiliate: 'none', status: 'skipped', message: `Score ${score.total} — routed to ${score.recommendation}, no affiliate submission.` }
}

async function submitToLendio(ctx: ApplicationContext, score: ScoreBreakdown): Promise<AffiliateRouteResult> {
  if (!process.env.LENDIO_API_KEY) {
    return { affiliate: 'lendio', status: 'submitted', referenceId: `MOCK-LENDIO-${Date.now()}`, message: 'Mock submission (no API key)' }
  }

  const res = await fetch(`${process.env.LENDIO_API_URL}/leads`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.LENDIO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_name: ctx.businessName,
      contact_name: ctx.applicantName,
      loan_amount: ctx.loanAmount,
      business_type: ctx.businessType,
      score: score.total,
    }),
  })

  if (!res.ok) {
    return { affiliate: 'lendio', status: 'rejected', message: `Lendio API error: ${res.status}` }
  }

  const data = await res.json()
  return { affiliate: 'lendio', status: 'submitted', referenceId: data.lead_id, message: 'Successfully submitted to Lendio.' }
}

async function submitToKapitus(ctx: ApplicationContext, score: ScoreBreakdown): Promise<AffiliateRouteResult> {
  if (!process.env.KAPITUS_API_KEY) {
    return { affiliate: 'kapitus', status: 'submitted', referenceId: `MOCK-KAPITUS-${Date.now()}`, message: 'Mock submission (no API key)' }
  }

  const res = await fetch(`${process.env.KAPITUS_API_URL}/applications`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.KAPITUS_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_name: ctx.businessName,
      applicant_name: ctx.applicantName,
      requested_amount: ctx.loanAmount,
      business_type: ctx.businessType,
    }),
  })

  if (!res.ok) {
    return { affiliate: 'kapitus', status: 'rejected', message: `Kapitus API error: ${res.status}` }
  }

  const data = await res.json()
  return { affiliate: 'kapitus', status: 'submitted', referenceId: data.application_id, message: 'Successfully submitted to Kapitus.' }
}
