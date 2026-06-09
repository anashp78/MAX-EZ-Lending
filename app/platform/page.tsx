import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Platform Architecture',
  description: 'Technical architecture of the MAX EV Business Lending AI underwriting platform.',
  robots: { index: false },
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-12">
    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5 pb-3 border-b border-slate-100">{title}</h2>
    {children}
  </section>
)

const Row = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="grid grid-cols-12 gap-4 py-2.5 border-b border-slate-50 last:border-0">
    <dt className="col-span-4 text-xs text-slate-400 font-medium pt-0.5">{label}</dt>
    <dd className={`col-span-8 text-sm text-slate-700 ${mono ? 'font-mono text-xs bg-slate-50 px-2 py-0.5 rounded' : ''}`}>{value}</dd>
  </div>
)

const ToolRow = ({ step, name, desc, status }: { step: string; name: string; desc: string; status: 'live' | 'mock' | 'conditional' }) => {
  const badge = {
    live:        { label: 'Live',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    mock:        { label: 'Mock',        cls: 'bg-amber-50  text-amber-700  border-amber-200' },
    conditional: { label: 'Conditional', cls: 'bg-blue-50   text-blue-700   border-blue-200' },
  }[status]

  return (
    <div className="flex gap-4 py-3 border-b border-slate-50 last:border-0">
      <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-mono font-semibold text-slate-800">{name}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
        </div>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  )
}

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            MAX EV Business Lending
          </Link>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Platform Architecture</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-14">
        {/* Title */}
        <div className="mb-12">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-3">Technical Reference</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Platform Architecture</h1>
          <p className="text-slate-500 max-w-2xl leading-relaxed">
            MAX EV Business Lending is an AI-first loan pre-qualification and lead routing platform. The system uses a
            multi-step agentic underwriting pipeline, real-time SSE streaming, and a multi-tenant data model. This page
            documents the technical stack, data flow, and integration points.
          </p>
        </div>

        {/* Stack */}
        <Section title="Core Stack">
          <dl>
            <Row label="Framework"       value="Next.js 16.2.7 — App Router, Turbopack, React 19" />
            <Row label="Language"        value="TypeScript 5 (strict)" />
            <Row label="Styling"         value="Tailwind CSS v4" />
            <Row label="ORM"             value="Prisma 6" />
            <Row label="Database"        value="PostgreSQL 16 with pgvector extension" />
            <Row label="Auth"            value="NextAuth v5 (beta) — credentials provider" />
            <Row label="Email"           value="Nodemailer — Hostinger SMTP (port 465, SSL)" />
            <Row label="Encryption"      value="AES-256-GCM via @aws-crypto/client-node — PII fields (SSN)" />
            <Row label="Runtime"         value="Node.js — PM2 process manager, port 3040" />
            <Row label="Reverse Proxy"   value="Nginx — proxy_buffering off for SSE, SSL via Let's Encrypt" />
          </dl>
        </Section>

        {/* AI Layer */}
        <Section title="AI Layer">
          <dl className="mb-6">
            <Row label="Underwriting Model" value="Claude claude-sonnet-4-6 (claude-sonnet-4-6)" />
            <Row label="Chat Model"         value="Claude Haiku 4.5 (claude-haiku-4-5-20251001)" />
            <Row label="AI SDK"             value="@anthropic-ai/sdk — native tool use, streaming text" />
            <Row label="Embedding Model"    value="OpenAI text-embedding-3-small (optional — RAG vector search)" />
            <Row label="RAG Fallback"       value="Keyword-based scoring — no OpenAI key required" />
            <Row label="Vector Store"       value="pgvector on PostgreSQL — cosine distance (<=>)" />
          </dl>
          <div className="bg-slate-50 rounded-xl p-5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Underwriting Agent Tool Sequence</div>
            <ToolRow step="1" name="questionnaire_analysis" desc="Reads self-reported financial profile from DB. Computes cash flow metrics, NSF penalty, and credit volatility proxy." status="live" />
            <ToolRow step="2" name="snowflake_benchmarks"   desc="Fetches SBA industry default rates and median loan amounts by NAICS and state from Snowflake dataset." status="mock" />
            <ToolRow step="3" name="sba_history_lookup"     desc="Queries historical SBA 7(a) loan outcomes by NAICS, state, and loan band." status="mock" />
            <ToolRow step="4" name="rag_search"             desc="Semantic or keyword search over SBA guidelines, eligibility rules, and affiliate policies ingested into pgvector." status="conditional" />
            <ToolRow step="5" name="score_calculator"       desc="Deterministic 6-dimension scoring (0–100). Outputs pre-qualified amount range and routing recommendation." status="live" />
            <ToolRow step="6" name="affiliate_router"       desc="Routes score >= 70 to Lendio, 55–69 to Kapitus. Returns mock reference IDs until real partner API keys are set." status="mock" />
            <ToolRow step="7" name="salesforce_writer"      desc="Writes lead + opportunity to Salesforce via jsforce. Returns mock SF IDs until org credentials are configured." status="mock" />
          </div>
          <p className="text-xs text-slate-400 mt-3">Mock = returns synthetic data when API credentials are absent. The agent loop and scoring remain fully functional in mock mode.</p>
        </Section>

        {/* Scoring Model */}
        <Section title="Underwriting Score Model">
          <dl>
            <Row label="Cash Flow"        value="0–20 pts — net margin, monthly surplus vs. loan payment, volatility" />
            <Row label="Business History" value="0–20 pts — years in operation, annual revenue relative to loan amount" />
            <Row label="Industry Risk"    value="0–20 pts — SBA benchmark default rate, regional adjustment" />
            <Row label="Credit Proxy"     value="0–15 pts — self-reported credit range, NSF frequency (12-month)" />
            <Row label="Loan Viability"   value="0–15 pts — debt-to-income, outstanding debt load, loan-to-revenue ratio" />
            <Row label="Compliance"       value="0–10 pts — RAG guideline flags, eligibility triggers" />
          </dl>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {[
              { range: '70–100', label: 'Route to Lendio',  color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              { range: '55–69',  label: 'Route to Kapitus', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { range: '40–54',  label: 'Manual Review',    color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { range: '0–39',   label: 'Decline',          color: 'bg-red-50 border-red-200 text-red-700' },
            ].map(b => (
              <div key={b.range} className={`border rounded-lg px-4 py-3 ${b.color}`}>
                <div className="font-mono font-bold text-base mb-0.5">{b.range}</div>
                <div className="text-xs font-medium">{b.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Data Model */}
        <Section title="Data Model">
          <dl>
            <Row label="Tenant"              value="Multi-tenant root. Isolates applications, documents, and agent runs per deployment." />
            <Row label="User"                value="Admin users scoped to a tenant. NextAuth session-based auth." />
            <Row label="Application"         value="Core entity. Holds all applicant fields, financial questionnaire, AI score, routing result, status, and admin notes." />
            <Row label="ApplicationDocument" value="Uploaded files (bank statements, tax returns, etc). Stored on server disk, path + metadata in DB." />
            <Row label="AgentRun"            value="Full audit log of every tool call, input/output, timing, and final score per underwriting run." />
            <Row label="RagDocument"         value="Source documents ingested into the RAG system (SBA guidelines, policy PDFs)." />
            <Row label="RagChunk"            value="Chunked segments of RagDocuments with optional pgvector embeddings for semantic search." />
          </dl>
        </Section>

        {/* Application Flow */}
        <Section title="Application Flow">
          <ol className="space-y-3">
            {[
              ['Applicant submits 4-step form', 'Business info, loan details, personal info, financial questionnaire. Duplicate detection by email + active status.'],
              ['Application written to DB', 'Status = submitted. Admin email notification fires (non-blocking).'],
              ['Agent triggered via SSE', 'GET /api/agent/run?applicationId=... opens event stream. Agent loop begins with Claude claude-sonnet-4-6.'],
              ['7-tool pipeline executes', 'Each tool emits tool_start / tool_complete events streamed to decision page in real time.'],
              ['Score written to DB', 'Application updated with aiScore, aiScoreBreakdown (JSON), aiRecommendation, affiliateRouted, affiliateRefId, status.'],
              ['Applicant result email fires', 'Non-blocking. Contains score, decision, pre-qualified range, and link to results page.'],
              ['Applicant uploads documents', 'PDF upload to /api/documents/upload. Files saved to uploads/ dir on server disk.'],
              ['Admin reviews in dashboard', 'Detail page shows full profile, score breakdown, AI reasoning. Admin can re-run agent or manually override status/notes.'],
            ].map(([title, desc], i) => (
              <li key={i} className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 mb-0.5">{title}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Infrastructure */}
        <Section title="Infrastructure">
          <dl>
            <Row label="Server"          value="VPS — Ubuntu, Nginx, PM2 (app id 38, name: ezlending)" />
            <Row label="Database"        value="PostgreSQL 16 in Docker container (port 5437), pgvector enabled" />
            <Row label="Port"            value="3040 (internal) — proxied through Nginx on 443" />
            <Row label="SSL"             value="Let's Encrypt via certbot — auto-renewing" />
            <Row label="Build"           value="npm run build (Turbopack) — SCP deploy, pm2 restart ezlending" />
            <Row label="Uploads"         value="Server disk at /var/www/ezlending/public/uploads/ — not versioned" />
            <Row label="Env"             value=".env on VPS — ANTHROPIC_API_KEY, DATABASE_URL, NEXTAUTH_SECRET, SMTP_USER, SMTP_PASS" />
          </dl>
        </Section>

        {/* Chat */}
        <Section title="Chat Interfaces">
          <dl>
            <Row label="Pre-Qual Widget"   value="Floating bottom-right widget on homepage. Haiku-powered. Collects 4 data points, delivers soft estimate, prompts to apply." />
            <Row label="Decision Chat"     value="Inline post-decision chat on results page. Score and recommendation injected into system prompt for context-aware Q&A." />
            <Row label="Transport"         value="ReadableStream — text/plain chunked response. Client reads with response.body.getReader()." />
            <Row label="Context"           value="Pre-qual: no PII, ephemeral. Decision: applicationId + score + rec in system prompt, no conversation stored." />
          </dl>
        </Section>

        {/* Integrations */}
        <Section title="External Integrations">
          <dl>
            <Row label="Lendio"      value="Affiliate lending partner. Score >= 70 routing. API integration pending — mock mode active." />
            <Row label="Kapitus"     value="Affiliate lending partner. Score 55–69 routing. API integration pending — mock mode active." />
            <Row label="Salesforce"  value="CRM write-back via jsforce. Lead + Opportunity created per underwritten application. Mock mode active." />
            <Row label="Snowflake"   value="SBA 7(a) loan dataset. Industry benchmark queries by NAICS + state. Mock mode active." />
            <Row label="OpenAI"      value="Optional — text-embedding-3-small for RAG vector search. Keyword fallback used when key absent." />
          </dl>
        </Section>

        {/* Security */}
        <Section title="Security">
          <dl>
            <Row label="SSN Storage"       value="AES-256-GCM encrypted at rest. ssnEncrypted field — plaintext never persisted." />
            <Row label="Auth"              value="bcrypt-free — NextAuth credentials with direct string comparison + NEXTAUTH_SECRET signing." />
            <Row label="Admin Routes"      value="All /admin/* and /api/admin/* routes require authenticated session." />
            <Row label="Tenant Isolation"  value="All application queries scoped to tenantId — cross-tenant data access blocked at ORM layer." />
            <Row label="File Uploads"      value="PDF only, 10MB max, stored outside web root. Filenames sanitized." />
            <Row label="Duplicate Guard"   value="One active application per email address — 409 conflict on re-submit." />
          </dl>
        </Section>

        <div className="mt-16 pt-8 border-t border-slate-100 text-xs text-slate-400">
          MAX EV Business Lending is not a direct lender. Architecture documentation is for transparency and technical review purposes.
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
        </div>
      </main>
    </div>
  )
}
