'use client'
import { useEffect, useRef, useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ScoreContext {
  total: number
  recommendation: string
  qualifiedAmountMin: number
  qualifiedAmountMax: number
  cashFlow: number
  creditProxy: number
  businessHistory: number
  industryRisk: number
  loanViability: number
  complianceFlags: number
  reasoning: string
}

function buildGreeting(ctx: ScoreContext): string {
  const rec = ctx.recommendation
  if (rec === 'lendio' || rec === 'kapitus') {
    const partner = rec === 'lendio' ? 'Lendio' : 'Kapitus'
    return `Your application scored ${ctx.total}/100 and you've been approved for ${partner} routing — great result. You're pre-qualified for an estimated $${ctx.qualifiedAmountMin.toLocaleString()}–$${ctx.qualifiedAmountMax.toLocaleString()}. What questions do you have about your results or next steps?`
  }
  if (rec === 'manual_review') {
    return `Your application scored ${ctx.total}/100 and is heading to manual review. A specialist will take a closer look. I can walk you through what factors drove your score or what lenders typically look for. What would you like to know?`
  }
  return `Your application scored ${ctx.total}/100. I can help you understand what impacted your score and what you could do differently to strengthen a future application. What would you like to know?`
}

export default function DecisionChat({ scoreContext }: { scoreContext: ScoreContext }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: buildGreeting(scoreContext) },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setStreaming(true)
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, scoreContext }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value)
        setMessages(m => [...m.slice(0, -1), { role: 'assistant', content: full }])
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden mb-8">
      {/* Header */}
      <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
        </div>
        <div>
          <div className="text-white text-sm font-semibold">Ask About Your Results</div>
          <div className="text-slate-400 text-xs">Lending Advisor — Powered by Claude AI</div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-slate-50 px-4 py-4 space-y-3 max-h-72 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-slate-900 text-white rounded-br-sm'
                : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 rounded-bl-sm'
            }`}>
              {msg.content || (
                <span className="flex gap-1 items-center py-0.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-4 py-3 bg-white border-t border-slate-100 flex flex-wrap gap-2">
          {[
            'Why did I score this?',
            'How can I improve?',
            'What happens next?',
            'Will the lender contact me?',
          ].map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); inputRef.current?.focus() }}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-200 flex gap-2 items-center bg-white">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={streaming}
          placeholder="Ask anything about your score or next steps..."
          className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400 disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={!input.trim() || streaming}
          className="w-9 h-9 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
        >
          <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
