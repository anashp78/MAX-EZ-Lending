import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DOCUMENTS = [
  {
    title: 'SBA 7(a) Loan Program Overview',
    source: 'sba_7a',
    content: `The SBA 7(a) Loan Program is the SBA's primary program for providing financial assistance to small businesses. Maximum loan amount is $5 million. Eligible uses include working capital, machinery/equipment, furniture/fixtures, land/buildings, leasehold improvements, and debt refinancing. Repayment terms: up to 10 years for working capital, up to 25 years for real estate. SBA guarantees up to 85% for loans up to $150,000 and 75% for loans over $150,000.`,
  },
  {
    title: 'SBA Eligibility Requirements',
    source: 'sba_eligibility',
    content: `To be eligible for SBA 7(a) financing, a business must: operate for profit, be considered a small business as defined by SBA, be engaged in or propose to do business in the U.S., have reasonable invested equity, use alternative financial resources including personal assets before seeking financial assistance, be able to demonstrate a need for the loan proceeds, use the funds for a sound business purpose, not be delinquent on any existing debt obligations to the U.S. government. Ineligible businesses include: lending businesses, life insurance companies, businesses located in foreign countries, pyramid sale distribution plans, businesses primarily engaged in gambling, businesses involved in illegal activities.`,
  },
  {
    title: 'SBA SOP 50 10 — Affiliation and Size Standards',
    source: 'sba_sop',
    content: `SBA uses the North American Industry Classification System (NAICS) to determine size standards. Size standards are expressed in either millions of dollars (average annual receipts) or number of employees. Affiliation rules apply: if one entity has the power to control another, SBA considers them affiliated. Businesses must independently own and operate. For loans up to $350,000, lenders use SBA Streamlined processing. For loans $350,001 to $2M, standard processing. Above $2M, full SBA review required. Personal guarantee required from anyone owning 20% or more.`,
  },
  {
    title: 'Lendio Partner Program Requirements',
    source: 'lendio_terms',
    content: `Lendio requires: minimum 6 months in business, minimum $50,000 annual revenue, no active bankruptcies, business bank account required, valid EIN, minimum credit score 550 (varies by lender). Lendio connects borrowers to 75+ lenders. Typical loan ranges: $1,000 to $5M. Lendio earns commission from lenders — no cost to borrower. Best fit: scores 70+ on our underwriting model, strong cash flow history, established business (2+ years preferred).`,
  },
  {
    title: 'Kapitus Lending Criteria',
    source: 'kapitus_guide',
    content: `Kapitus specializes in small business financing for businesses with less-than-perfect credit or shorter operating history. Requirements: minimum 1 year in business, minimum $150,000 annual revenue, active business bank account, no open bankruptcies filed within 12 months. Kapitus offers: revenue-based financing, term loans, lines of credit, equipment financing. Approval rates higher for businesses with consistent monthly deposits even if volatile. Best fit: scores 55-69 on our underwriting model, 1-3 years in business, some cash flow inconsistency acceptable.`,
  },
  {
    title: 'High-Risk NAICS Codes',
    source: 'naics_risk',
    content: `The following NAICS sectors have elevated default rates based on SBA historical data and require additional scrutiny: 722 (Food Services and Drinking Places) — 8.2% default rate; 531 (Real Estate) — variable risk; 713 (Gambling — INELIGIBLE for SBA); 812 (Personal Care Services) — 7.1% default rate; 561 (Administrative and Support Services) — 6.8% default rate; 517 (Telecommunications) — 5.9% default rate. Retail trade (44-45) shows 6.4% default. Construction (23) shows 5.1% default. Healthcare (62) shows 3.2% default. Professional services (54) shows 2.8% default.`,
  },
  {
    title: 'Internal Underwriting Criteria',
    source: 'internal',
    content: `EZ Lending underwriting thresholds: Score 70-100 = Lendio route (prime borrower, strong cash flow, established business); Score 55-69 = Kapitus route (moderate borrower, some risk factors, shorter history acceptable); Score 40-54 = Manual Review (borderline, requires human underwriter review); Score <40 = Decline (insufficient cash flow, high industry risk, or compliance issues). Key disqualifiers regardless of score: active bankruptcy, delinquent federal debt, less than 6 months in business, loan amount > 5x annual revenue, ineligible NAICS codes (gambling, illegal activities). NSF count > 5 in 12 months = automatic Kapitus or Manual Review regardless of score. Volatility score > 0.7 = flag for manual review.`,
  },
]

const CHUNK_SIZE = 512
const CHUNK_OVERLAP = 64

function chunkText(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ')
    chunks.push(chunk)
    i += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text })
  return res.data[0].embedding
}

async function main() {
  console.log(`Seeding ${DOCUMENTS.length} documents...`)

  for (const doc of DOCUMENTS) {
    const existing = await prisma.ragDocument.findFirst({ where: { source: doc.source, title: doc.title } })
    if (existing) {
      console.log(`  Skipping (exists): ${doc.title}`)
      continue
    }

    const chunks = chunkText(doc.content)
    const document = await prisma.ragDocument.create({
      data: { title: doc.title, source: doc.source, content: doc.content, chunkCount: chunks.length },
    })

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embed(chunks[i])
      const vector = `[${embedding.join(',')}]`
      await prisma.$executeRaw`
        INSERT INTO "RagChunk" (id, "documentId", "chunkIndex", content, embedding)
        VALUES (gen_random_uuid(), ${document.id}, ${i}, ${chunks[i]}, ${vector}::vector)
      `
      process.stdout.write('.')
    }
    console.log(`\n  Done: ${doc.title} (${chunks.length} chunks)`)
  }

  console.log('\nRAG seed complete.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
