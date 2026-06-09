# EZ Lending — CLAUDE.md

AI-powered small business loan pre-qualification and lead routing platform.
Live at: https://lending.maxevdigital.com
PM2: id 38, name `ezlending`, port 3040

---

## Stack

- **Framework**: Next.js 16.2.7, App Router, Turbopack, React 19
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS v4
- **ORM**: Prisma 6
- **Database**: PostgreSQL 16 + pgvector — Docker container on VPS, port 5437
- **Auth**: NextAuth v5 beta — credentials provider, direct string compare (no bcrypt)
- **AI (underwriting)**: Claude claude-sonnet-4-6 via @anthropic-ai/sdk
- **AI (chat)**: Claude Haiku 4.5 (claude-haiku-4-5-20251001)
- **Email**: Nodemailer — Hostinger SMTP (smtp.hostinger.com:465)
- **Encryption**: @aws-crypto/client-node — AES-256-GCM for SSN field

---

## VPS Deploy

ALWAYS pull VPS file before editing — another Claude instance may edit VPS directly.

```bash
# Access
ssh -i ~/.ssh/id_ed25519 root@72.60.43.168

# Project root
/var/www/ezlending

# DB access (PostgreSQL in Docker)
docker exec -i ezlending-postgres psql -U ezlending -d ezlending

# Build + restart (requires explicit user approval)
cd /var/www/ezlending && npm run build
pm2 restart ezlending
```

Deploy = SCP individual files + git push. No npm run build without user approval.

---

## Environment Variables (.env on VPS)

| Var | Purpose |
|-----|---------|
| DATABASE_URL | PostgreSQL connection string (port 5437) |
| ANTHROPIC_API_KEY | Required — underwriting agent + chat |
| NEXTAUTH_SECRET | Required — session signing |
| NEXTAUTH_URL | https://lending.maxevdigital.com |
| TENANT_DEFAULT_SLUG | fundingos — default tenant (already in DB) |
| SMTP_USER | Hostinger email — emails silently skip if absent |
| SMTP_PASS | Hostinger email password |
| EMAIL_FROM | Optional — defaults to MAX EV Business Lending address |
| OPENAI_API_KEY | Optional — enables vector RAG search; keyword fallback if absent |
| ENCRYPTION_KEY | AES-256 key for SSN encryption |

---

## Agent Tool Sequence (strict order)

```
1. questionnaire_analysis  ->  reads self-reported DB fields
2. snowflake_benchmarks    ->  SBA industry data by NAICS + state
3. sba_history_lookup      ->  historical SBA 7(a) outcomes
4. rag_search              ->  guideline/compliance check (keyword or vector)
5. score_calculator        ->  deterministic 6-dim score (0-100)
6. affiliate_router        ->  routes to Lendio (>=70) or Kapitus (55-69)
7. salesforce_writer       ->  CRM write-back -- ALWAYS last
```

Tools 2, 3, 6, 7 are in mock mode -- return synthetic data when no API credentials are configured. The agent loop and scoring work fully in mock mode.

---

## Score Model

| Dimension | Max | Driver |
|-----------|-----|--------|
| Cash Flow | 20 | Net margin, monthly surplus, volatility |
| Business History | 20 | Years in operation, revenue vs loan |
| Industry Risk | 20 | SBA default rate, regional adjustment |
| Credit Proxy | 15 | Self-reported credit range + NSF frequency |
| Loan Viability | 15 | Debt-to-income, loan-to-revenue |
| Compliance | 10 | RAG guideline flags |

Routing: >=70 Lendio, 55-69 Kapitus, 40-54 manual_review, <40 decline

---

## Key Files

| File | Role |
|------|------|
| lib/agent/runner.ts | Main agent loop -- Claude tool use, SSE emit, DB persist |
| lib/tools/questionnaire-analysis.ts | Reads financial questionnaire from DB, outputs PlaidAnalysisResult shape |
| lib/tools/score-calculator.ts | Deterministic scoring + qualified amount range |
| lib/tools/rag-search.ts | Vector search (OpenAI) with keyword fallback |
| lib/tools/affiliate-router.ts | Routes by score, returns mock refs if no API keys |
| lib/tools/salesforce-writer.ts | jsforce CRM write, mock if no SF creds |
| lib/email.ts | Nodemailer wrapper -- admin alert + applicant result emails |
| lib/encryption.ts | AES-256 encrypt/decrypt for SSN |
| lib/tenant.ts | Resolves tenant from host header or TENANT_DEFAULT_SLUG |
| app/api/agent/run/route.ts | POST = async trigger, GET = SSE stream |
| app/api/applications/route.ts | POST = create app (dupe check, admin email), GET = paginated list |
| app/api/chat/prequal/route.ts | Streaming Haiku pre-qual widget |
| app/api/chat/decision/route.ts | Streaming Haiku post-decision chat |
| app/api/documents/upload/route.ts | PDF upload, 10MB max, saves to disk |
| app/apply/page.tsx | 4-step application form |
| app/apply/decision/page.tsx | Real-time agent SSE + results display |
| app/admin/page.tsx | Admin dashboard -- search, filter, paginated table |
| app/admin/applications/[id]/page.tsx | Application detail -- profile, score, docs |
| app/admin/applications/[id]/StatusPanel.tsx | Client -- status + notes PATCH |
| app/admin/applications/[id]/RunAgentButton.tsx | Client -- trigger/re-run agent from admin |
| app/platform/page.tsx | Public technical architecture page |
| app/sitemap.ts | Auto-generated sitemap.xml |
| app/robots.ts | robots.txt -- blocks /admin and /api |
| scripts/seed-rag.ts | Seeds RagDocument + RagChunk with SBA guidelines (needs OPENAI_API_KEY) |
| prisma/schema.prisma | Full data model |

---

## Database Migrations

All migrations are additive SQL files run manually:

```bash
docker exec -i ezlending-postgres psql -U ezlending -d ezlending < prisma/add_notes_field.sql
npx prisma generate  # after any schema change
```

Prisma migrate is NOT used -- raw SQL only.

---

## Multi-Tenant

- Tenant resolved from Host header -> DB lookup, falls back to TENANT_DEFAULT_SLUG
- Default tenant slug: fundingos (name: "EZ Lending" in DB)
- All application queries scoped to tenantId
- POST /api/applications does NOT require auth (public form) -- tenant from host only

---

## Chat Architecture

Both chat interfaces stream via ReadableStream (text/plain, chunked):
- PrequalChat -- floating widget, homepage only, ephemeral, no PII
- DecisionChat -- post-decision, applicationId in system prompt for context

---

## Known Patterns / Pitfalls

- No bcrypt -- NextAuth credentials uses plain string compare. Passwords stored plaintext.
- No Prisma migrate -- use raw SQL files in prisma/ dir, run via docker exec.
- SSE + Nginx -- proxy_buffering off required in nginx config for SSE to work.
- Turbopack build times -- approximately 7 min on VPS, be patient.
- Smart quotes in JSX -- Edit tool can introduce curly quotes causing Turbopack failure.
- plaidData reference -- agent/run route.ts still references plaidData in one include (harmless).
- Uploads dir -- /var/www/ezlending/public/uploads/ -- not in git, not persisted if server moves.

---

## Git

This project uses git. Remote: https://github.com/anashp78/MAX-EZ-Lending
Branch: main
Deploy: SCP files to VPS + git push origin main
