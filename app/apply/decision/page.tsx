'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const TOOL_LABELS: Record<string, string> = {
  plaid_analysis: 'Analyzing bank transactions',
  snowflake_benchmarks: 'Fetching industry benchmarks',
  sba_history_lookup: 'Reviewing SBA loan history',
  rag_search: 'Checking lending guidelines',
  score_calculator: 'Calculating underwriting score',
  affiliate_router: 'Routing to lending partner',
  salesforce_writer: 'Recording application',
}

const TOOL_DETAIL: Record<string, string> = {
  plaid_analysis: '12 months of cash flow',
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

function DecisionContent() {
  const params = useSearchParams()
  const applicationId = params.get('id')

  const [steps, setSteps] = useState<Step[]>([])
  const [score, setScore] = useState<Record<string, number | string> | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

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

  const totalTools = Object.keys(TOOL_LABELS).length
  const completedCount = steps.filter(s => s.status === 'done').length
  const progressPct = totalTools > 0 ? (completedCount / totalTools) * 100 : 0

  const rec = score ? (score.recommendation as string) : null
  const recCfg = rec ? REC_CONFIG[rec] : null

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
            {/* Score + recommendation */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8 mb-6">
              <div className="flex items-center gap-6 mb-8">
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
