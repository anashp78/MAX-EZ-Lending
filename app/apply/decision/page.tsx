'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const DecisionChat = dynamic(() => import('@/components/DecisionChat'), { ssr: false })

const TOOL_LABELS: Record<string, string> = {
  questionnaire_analysis: 'Reviewing financial profile',
  snowflake_benchmarks: 'Fetching industry benchmarks',
  sba_history_lookup: 'Reviewing SBA loan history',
  rag_search: 'Checking lending guidelines',
  score_calculator: 'Calculating underwriting score',
  affiliate_router: 'Routing to lending partner',
  salesforce_writer: 'Recording application',
}

const TOOL_DETAIL: Record<string, string> = {
  questionnaire_analysis: 'Income, expenses, credit profile',
  snowflake_benchmarks: 'SBA industry database',
  sba_history_lookup: 'Historical loan outcomes',
  rag_search: 'Policy and compliance check',
  score_calculator: '6-dimension scoring model',
  affiliate_router: 'Lendio and Kapitus routing',
  salesforce_writer: 'CRM write-back',
}

interface Step {
  tool: string
  status: 'running' | 'done'
  durationMs?: number
}

const REC_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  lendio: {
    label: 'Approved — Routing to Lendio',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  kapitus: {
    label: 'Approved — Routing to Kapitus',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  manual_review: {
    label: 'Manual Review Required',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  decline: {
    label: 'Not Approved at This Time',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
}

const SCORE_DIMS = [
  { label: 'Cash Flow', key: 'cashFlow', max: 20 },
  { label: 'Business History', key: 'businessHistory', max: 20 },
  { label: 'Industry Risk', key: 'industryRisk', max: 20 },
  { label: 'Credit Proxy', key: 'creditProxy', max: 15 },
  { label: 'Loan Viability', key: 'loanViability', max: 15 },
  { label: 'Compliance', key: 'complianceFlags', max: 10 },
]

const DOC_TYPE_OPTIONS = [
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'tax_return', label: 'Tax Return' },
  { value: 'business_license', label: 'Business License' },
  { value: 'other', label: 'Other Document' },
]

function DecisionContent() {
  const params = useSearchParams()
  const applicationId = params.get('id')

  const [steps, setSteps] = useState<Step[]>([])
  const [score, setScore] = useState<Record<string, number | string> | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Upload state
  const [docType, setDocType] = useState('bank_statement')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ fileName: string; type: string }>>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!applicationId) return

    fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId }),
    })

    const es = new EventSource(`/api/agent/run?applicationId=${applicationId}`)

    es.onmessage = (e) => {
      const event = JSON.parse(e.data)
      if (event.type === 'tool_start') {
        setSteps(prev => [...prev, { tool: event.tool, status: 'running' as const }])
      }
      if (event.type === 'tool_complete') {
        setSteps(prev =>
          prev.map(s => s.tool === event.tool ? { ...s, status: 'done' as const, durationMs: event.durationMs } : s)
        )
      }
      if (event.type === 'score') setScore(event.score)
      if (event.type === 'complete') { setDone(true); es.close() }
      if (event.type === 'error') { setError(event.message); es.close() }
    }

    return () => es.close()
  }, [applicationId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !applicationId) return
    setUploadLoading(true)
    setUploadError('')
    const fd = new FormData()
    fd.append('applicationId', applicationId)
    fd.append('docType', docType)
    fd.append('file', file)
    const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadLoading(false)
    if (!res.ok) {
      setUploadError(data.error || 'Upload failed')
    } else {
      setUploadedDocs(prev => [...prev, { fileName: data.fileName, type: docType }])
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const totalTools = Object.keys(TOOL_LABELS).length
  const completedCount = steps.filter(s => s.status === 'done').length
  const progressPct = totalTools > 0 ? (completedCount / totalTools) * 100 : 0

  const rec = score ? (score.recommendation as string) : null
  const recCfg = rec ? REC_CONFIG[rec] : null
  const qualifiedMin = score ? (score.qualifiedAmountMin as number) : 0
  const qualifiedMax = score ? (score.qualifiedAmountMax as number) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">ME</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm">MAX EV Business Lending</span>
          </Link>
          <span className="text-slate-400 text-xs hidden sm:block">
            {done ? 'Analysis complete' : 'AI analysis running...'}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {done ? 'Underwriting Complete' : 'Analyzing Your Application'}
          </h1>
          <p className="text-slate-500 text-sm">
            {done
              ? 'Your full underwriting report is below.'
              : 'Our AI is reviewing your data across multiple sources. This takes about 30 seconds.'}
          </p>
        </div>

        {/* Progress bar */}
        {!done && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Progress</span>
              <span>{completedCount} of {totalTools} checks complete</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Tool steps */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 divide-y divide-slate-100 mb-8">
          {Object.entries(TOOL_LABELS).map(([tool, label]) => {
            const s = steps.find(x => x.tool === tool)
            return (
              <div key={tool} className="flex items-center gap-4 px-6 py-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  s?.status === 'done' ? 'bg-emerald-100' :
                  s?.status === 'running' ? 'bg-amber-100' :
                  'bg-slate-100'
                }`}>
                  {s?.status === 'done' && (
                    <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {s?.status === 'running' && (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  )}
                  {!s && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${s ? 'text-slate-900' : 'text-slate-400'}`}>{label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{TOOL_DETAIL[tool]}</div>
                </div>
                {s?.durationMs !== undefined && (
                  <span className="text-xs text-slate-400 flex-shrink-0">{(s.durationMs / 1000).toFixed(1)}s</span>
                )}
                {s?.status === 'running' && (
                  <span className="text-xs text-amber-600 flex-shrink-0 font-medium">Running</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-5 py-4 rounded-xl mb-8">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {done && score && (
          <>
            {/* Score + recommendation + qualified amount */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8 mb-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="flex-shrink-0 w-24 h-24 rounded-full bg-slate-50 ring-8 ring-slate-100 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-slate-900">{score.total as number}</div>
                  <div className="text-xs text-slate-400 font-medium">/ 100</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold tracking-widest mb-2">Underwriting Score</div>
                  {recCfg && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${recCfg.bg} ${recCfg.color} ${recCfg.border}`}>
                      <span className={`w-2 h-2 rounded-full ${recCfg.dot} flex-shrink-0`}></span>
                      {recCfg.label}
                    </div>
                  )}
                </div>
              </div>

              {/* Qualified amount band */}
              {qualifiedMin > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 mb-8">
                  <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wider mb-1">Pre-Qualified Amount</div>
                  <div className="text-2xl font-bold text-emerald-800">
                    ${qualifiedMin.toLocaleString()} &mdash; ${qualifiedMax.toLocaleString()}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">Based on your financial profile and underwriting score. Final amount subject to lender review.</div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-5">Score Breakdown</h3>
                <div className="space-y-4">
                  {SCORE_DIMS.map(dim => {
                    const val = score[dim.key] as number
                    const pct = (val / dim.max) * 100
                    const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                    return (
                      <div key={dim.key}>
                        <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                          <span className="font-medium">{dim.label}</span>
                          <span className="text-slate-500">{val} / {dim.max}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* AI reasoning */}
            {score.reasoning && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">AI Analysis Summary</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{score.reasoning as string}</p>
              </div>
            )}

            {/* Document upload */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6 mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Upload Supporting Documents</h3>
              <p className="text-slate-500 text-sm mb-5">
                Strengthen your application by uploading recent bank statements or tax returns. Optional but recommended.
              </p>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Document Type</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">File (PDF, JPG, PNG — max 10 MB)</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>
                {uploadError && (
                  <div className="text-sm text-red-600">{uploadError}</div>
                )}
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="w-full border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>

              {uploadedDocs.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedDocs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="truncate">{doc.fileName}</span>
                      <span className="text-slate-400 text-xs ml-auto flex-shrink-0">{DOC_TYPE_OPTIONS.find(o => o.value === doc.type)?.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Decision chat */}
            <DecisionChat scoreContext={{
              total: score.total as number,
              recommendation: score.recommendation as string,
              qualifiedAmountMin: (score.qualifiedAmountMin as number) ?? 0,
              qualifiedAmountMax: (score.qualifiedAmountMax as number) ?? 0,
              cashFlow: score.cashFlow as number,
              creditProxy: score.creditProxy as number,
              businessHistory: score.businessHistory as number,
              industryRisk: score.industryRisk as number,
              loanViability: score.loanViability as number,
              complianceFlags: score.complianceFlags as number,
              reasoning: score.reasoning as string,
            }} />

            {/* Next steps */}
            <div className="bg-white rounded-xl ring-1 ring-slate-200 p-6 text-center mb-8">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">What Happens Next</h3>
              <p className="text-slate-500 text-sm">
                {rec === 'lendio' || rec === 'kapitus'
                  ? 'Your application has been routed to your lending partner. A specialist will contact you within 1 business day to complete the process.'
                  : rec === 'manual_review'
                  ? 'Your application requires additional review. Our team will be in touch within 2 business days.'
                  : 'We were unable to match you with a lending partner at this time. You may reapply in 90 days.'}
              </p>
            </div>

            <div className="text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to homepage
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function DecisionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    }>
      <DecisionContent />
    </Suspense>
  )
}
