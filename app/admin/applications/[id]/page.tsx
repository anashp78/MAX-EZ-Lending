import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import AdminStatusPanel from './StatusPanel'
import RunAgentButton from './RunAgentButton'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  submitted:    { label: 'Submitted',    bg: 'bg-slate-100',  color: 'text-slate-600' },
  under_review: { label: 'Under Review', bg: 'bg-amber-50',   color: 'text-amber-700' },
  approved:     { label: 'Approved',     bg: 'bg-emerald-50', color: 'text-emerald-700' },
  declined:     { label: 'Declined',     bg: 'bg-red-50',     color: 'text-red-700' },
  funded:       { label: 'Funded',       bg: 'bg-blue-50',    color: 'text-blue-700' },
}

const SCORE_DIMS = [
  { label: 'Cash Flow',        key: 'cashFlow',        max: 20 },
  { label: 'Business History', key: 'businessHistory', max: 20 },
  { label: 'Industry Risk',    key: 'industryRisk',    max: 20 },
  { label: 'Credit Proxy',     key: 'creditProxy',     max: 15 },
  { label: 'Loan Viability',   key: 'loanViability',   max: 15 },
  { label: 'Compliance',       key: 'complianceFlags', max: 10 },
]

const NSF_LABELS: Record<string, string> = { '0': 'None', '1-3': '1–3', '4-10': '4–10', '10+': '10+' }
const CREDIT_LABELS: Record<string, string> = {
  '720_plus': '720+ (Excellent)', '680_719': '680–719 (Good)', '620_679': '620–679 (Fair)',
  '580_619': '580–619 (Below Avg)', 'below_580': 'Below 580',
}
const DOC_TYPE_LABELS: Record<string, string> = {
  bank_statement: 'Bank Statement', tax_return: 'Tax Return',
  business_license: 'Business License', id: 'ID', other: 'Other',
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { uploadedAt: 'desc' } },
      agentRuns: { orderBy: { startedAt: 'desc' }, take: 1 },
    },
  })

  if (!app) redirect('/admin')

  const statusCfg = STATUS_CONFIG[app.status] ?? { label: app.status, bg: 'bg-slate-100', color: 'text-slate-600' }
  const breakdown = app.aiScoreBreakdown as Record<string, number | string> | null
  const qualifiedMin = (breakdown?.qualifiedAmountMin as number) ?? 0
  const qualifiedMax = (breakdown?.qualifiedAmountMax as number) ?? 0

  const recColors: Record<string, string> = {
    lendio: 'text-emerald-700', kapitus: 'text-blue-700',
    manual_review: 'text-amber-700', decline: 'text-red-700',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/admin" className="text-slate-400 hover:text-slate-700 text-sm transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 text-sm font-medium">{app.businessName || 'Application'}</span>
          <span className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: applicant data */}
        <div className="lg:col-span-2 space-y-5">

          {/* Business + Owner */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Business &amp; Owner</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DataRow label="Business Name"   value={app.businessName} />
              <DataRow label="Business Type"   value={app.businessType} />
              <DataRow label="State"           value={app.businessState} />
              <DataRow label="Years in Biz"    value={app.yearsInBusiness != null ? `${app.yearsInBusiness} yr` : null} />
              <DataRow label="Annual Revenue"  value={app.annualRevenue != null ? `$${app.annualRevenue.toLocaleString()}` : null} />
              <DataRow label="Employees"       value={app.employeeCount != null ? String(app.employeeCount) : null} />
              <DataRow label="NAICS"           value={app.naicsCode} />
              <DataRow label="Applicant"       value={app.applicantName} />
              <DataRow label="Email"           value={app.applicantEmail} />
              <DataRow label="Phone"           value={app.applicantPhone} />
            </dl>
          </div>

          {/* Loan request */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Loan Request</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DataRow label="Amount Requested" value={app.loanAmount != null ? `$${app.loanAmount.toLocaleString()}` : null} />
              <DataRow label="Purpose" value={app.loanPurpose} span />
            </dl>
          </div>

          {/* Financial questionnaire */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Financial Profile (Self-Reported)</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DataRow label="Monthly Revenue"  value={app.monthlyRevenue != null ? `$${app.monthlyRevenue.toLocaleString()}` : null} />
              <DataRow label="Avg Daily Balance" value={app.avgDailyBalance != null ? `$${app.avgDailyBalance.toLocaleString()}` : null} />
              <DataRow label="Monthly Expenses" value={app.monthlyExpenses != null ? `$${app.monthlyExpenses.toLocaleString()}` : null} />
              <DataRow label="Outstanding Debt"  value={app.outstandingDebt != null ? `$${app.outstandingDebt.toLocaleString()}` : null} />
              <DataRow label="NSF (12 mo)"       value={app.nsfRange ? NSF_LABELS[app.nsfRange] ?? app.nsfRange : null} />
              <DataRow label="Credit Range"      value={app.creditScoreRange ? CREDIT_LABELS[app.creditScoreRange] ?? app.creditScoreRange : null} />
            </dl>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Uploaded Documents
              <span className="ml-2 text-slate-400 font-normal">({app.documents.length})</span>
            </h2>
            {app.documents.length === 0 ? (
              <p className="text-slate-400 text-sm">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {app.documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 text-sm py-2 border-b border-slate-100 last:border-0">
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1 truncate text-slate-700">{doc.fileName}</span>
                    <span className="text-slate-400 text-xs">{DOC_TYPE_LABELS[doc.type] ?? doc.type}</span>
                    <span className="text-slate-400 text-xs">{doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)} KB` : ''}</span>
                    <span className="text-slate-400 text-xs">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: AI results + status */}
        <div className="space-y-5">

          {/* Score card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-5">AI Underwriting Result</h2>
            {app.aiScore != null ? (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-full bg-slate-50 ring-8 ring-slate-100 flex flex-col items-center justify-center flex-shrink-0">
                    <div className="text-2xl font-bold text-slate-900">{app.aiScore}</div>
                    <div className="text-xs text-slate-400">/100</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Score</div>
                    <div className={`text-sm font-semibold capitalize ${recColors[app.aiRecommendation ?? ''] ?? 'text-slate-700'}`}>
                      {app.aiRecommendation?.replace('_', ' ') ?? '—'}
                    </div>
                  </div>
                </div>

                {qualifiedMin > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-5">
                    <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wider mb-0.5">Pre-Qualified</div>
                    <div className="text-lg font-bold text-emerald-800">${qualifiedMin.toLocaleString()} — ${qualifiedMax.toLocaleString()}</div>
                  </div>
                )}

                {breakdown && (
                  <div className="space-y-3">
                    {SCORE_DIMS.map(dim => {
                      const val = breakdown[dim.key] as number ?? 0
                      const pct = (val / dim.max) * 100
                      const bar = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      return (
                        <div key={dim.key}>
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>{dim.label}</span>
                            <span className="text-slate-400">{val}/{dim.max}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {breakdown?.reasoning && (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">AI Reasoning</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{breakdown.reasoning as string}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400 text-sm">AI analysis not yet run.</p>
            )}
          </div>

          {/* Routing info */}
          {(app.affiliateRouted || app.sfLeadId) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Routing</h2>
              <dl className="space-y-2 text-sm">
                <DataRow label="Routed To"    value={app.affiliateRouted} />
                <DataRow label="Ref ID"       value={app.affiliateRefId} />
                <DataRow label="SF Lead ID"   value={app.sfLeadId} />
              </dl>
            </div>
          )}

          {/* Run agent */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">AI Underwriting</h2>
            <RunAgentButton applicationId={app.id} hasScore={app.aiScore != null} />
          </div>

          {/* Status + notes panel */}
          <AdminStatusPanel applicationId={app.id} currentStatus={app.status} currentNotes={(app as Record<string, unknown>).notes as string | null} />

          {/* Meta */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Meta</h2>
            <dl className="space-y-2 text-sm">
              <DataRow label="ID"        value={app.id} />
              <DataRow label="Submitted" value={new Date(app.createdAt).toLocaleString()} />
              {app.agentRuns[0] && <DataRow label="Agent Run" value={`${(app.agentRuns[0].durationMs ?? 0 / 1000).toFixed(1)}s`} />}
            </dl>
          </div>
        </div>
      </main>
    </div>
  )
}

function DataRow({ label, value, span }: { label: string; value: string | null | undefined; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <dt className="text-slate-400 text-xs mb-0.5">{label}</dt>
      <dd className="text-slate-700 font-medium">{value || <span className="text-slate-300 font-normal">—</span>}</dd>
    </div>
  )
}
