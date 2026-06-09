'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RunAgentButton({ applicationId, hasScore }: { applicationId: string; hasScore: boolean }) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function run() {
    setRunning(true)
    setError('')
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })
      if (!res.ok) throw new Error('Agent failed to start')
      // Poll until score appears (max 3 min)
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const check = await fetch(`/api/admin/applications/${applicationId}/score-check`)
        if (check.ok) {
          const { scored } = await check.json()
          if (scored || attempts > 36) {
            clearInterval(poll)
            setRunning(false)
            router.refresh()
          }
        }
      }, 5000)
    } catch (err) {
      setError((err as Error).message)
      setRunning(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
      >
        {running ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Running Agent...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {hasScore ? 'Re-run AI Agent' : 'Run AI Agent'}
          </>
        )}
      </button>
      {running && (
        <p className="text-xs text-slate-400 text-center">Underwriting in progress — this page will refresh automatically.</p>
      )}
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}
