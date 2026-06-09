/**
 * Keyword-only RAG seed — no OpenAI key required.
 * Inserts SBA guidelines and affiliate rules as text chunks with null embeddings.
 * The keyword fallback in lib/tools/rag-search.ts handles null embeddings natively.
 *
 * Run: node scripts/seed-rag-keyword.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DOCUMENTS = [
  {
    title: 'SBA 7(a) Loan Program Overview',
    source: 'sba_7a',
    content: `The SBA 7(a) Loan Program is the SBA's primary program for providing financial assistance to small businesses. Maximum loan amount is $5 million. Eligible uses include working capital, machinery equipment, furniture fixtures, land buildings, leasehold improvements, and debt refinancing. Repayment terms: up to 10 years for working capital, up to 25 years for real estate. SBA guarantees up to 85% for loans up to $150,000 and 75% for loans over $150,000.`,
  },
  {
    title: 'SBA Eligibility Requirements',
    source: 'sba_eligibility',
    content: `To be eligible for SBA 7(a) financing, a business must: operate for profit, be considered a small business as defined by SBA, be engaged in or propose to do business in the United States, have reasonable invested equity, use alternative financial resources including personal assets before seeking financial assistance, be able to demonstrate a need for the loan proceeds, use the funds for a sound business purpose, not be delinquent on any existing debt obligations to the U.S. government. Ineligible businesses include: lending businesses, life insurance companies, businesses located in foreign countries, pyramid sale distribution plans, businesses primarily engaged in gambling, businesses involved in illegal activities. Businesses must not have prior SBA loan defaults without resolution.`,
  },
  {
    title: 'SBA SOP 50 10 — Affiliation and Size Standards',
    source: 'sba_sop',
    content: `SBA uses the North American Industry Classification System NAICS to determine size standards. Size standards are expressed in either millions of dollars average annual receipts or number of employees. Affiliation rules apply: if one entity has the power to control another, SBA considers them affiliated. Businesses must independently own and operate. For loans up to $350,000, lenders use SBA Streamlined processing. For loans $350,001 to $2M, standard processing. Above $2M, full SBA review required. Personal guarantee required from anyone owning 20% or more of the business.`,
  },
  {
    title: 'Lendio Partner Program Requirements',
    source: 'lendio_terms',
    content: `Lendio requires: minimum 6 months in business, minimum $50,000 annual revenue, no active bankruptcies, business bank account required, valid EIN employer identification number, minimum credit score 550 varies by lender. Lendio connects borrowers to 75 or more lenders. Typical loan ranges: $1,000 to $5 million. Lendio earns commission from lenders with no cost to borrower. Best fit: scores 70 or above on our underwriting model, strong cash flow history, established business with 2 or more years preferred. Funding timelines range from 24 hours to 2 weeks depending on lender.`,
  },
  {
    title: 'Kapitus Lending Criteria',
    source: 'kapitus_guide',
    content: `Kapitus specializes in small business financing for businesses with less than perfect credit or shorter operating history. Requirements: minimum 1 year in business, minimum $150,000 annual revenue, active business bank account, no open bankruptcies filed within 12 months. Kapitus offers: revenue-based financing, term loans, lines of credit, equipment financing. Approval rates higher for businesses with consistent monthly deposits even if volatile. Best fit: scores 55 to 69 on our underwriting model, 1 to 3 years in business, some cash flow inconsistency acceptable. Average approval time 1 to 3 business days.`,
  },
  {
    title: 'High-Risk NAICS Codes',
    source: 'naics_risk',
    content: `The following NAICS sectors have elevated default rates based on SBA historical data and require additional scrutiny: 722 Food Services and Drinking Places has 8.2% default rate; 531 Real Estate has variable risk; 713 Gambling is INELIGIBLE for SBA; 812 Personal Care Services has 7.1% default rate; 561 Administrative and Support Services has 6.8% default rate; 517 Telecommunications has 5.9% default rate. Retail trade NAICS 44 to 45 shows 6.4% default. Construction NAICS 23 shows 5.1% default. Healthcare NAICS 62 shows 3.2% default. Professional services NAICS 54 shows 2.8% default. Gambling businesses are ineligible regardless of score.`,
  },
  {
    title: 'Internal Underwriting Criteria',
    source: 'internal',
    content: `EZ Lending underwriting thresholds: Score 70 to 100 equals Lendio route for prime borrower with strong cash flow and established business. Score 55 to 69 equals Kapitus route for moderate borrower with some risk factors and shorter history acceptable. Score 40 to 54 equals Manual Review for borderline cases requiring human underwriter review. Score below 40 equals Decline for insufficient cash flow, high industry risk, or compliance issues. Key disqualifiers regardless of score: active bankruptcy, delinquent federal debt, less than 6 months in business, loan amount greater than 5 times annual revenue, ineligible NAICS codes including gambling and illegal activities. NSF count greater than 5 in 12 months equals automatic Kapitus or Manual Review regardless of score. Volatility score above 0.7 equals flag for manual review. Outstanding debt greater than 3 times monthly revenue equals viability risk flag.`,
  },
]

function chunkText(text) {
  // Simple sentence-aware chunking — each document is short enough to be one chunk
  const words = text.split(/\s+/)
  const CHUNK_SIZE = 200
  const CHUNK_OVERLAP = 30
  const chunks = []
  let i = 0
  while (i < words.length) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '))
    i += CHUNK_SIZE - CHUNK_OVERLAP
    if (i >= words.length) break
  }
  return chunks.length ? chunks : [text]
}

async function main() {
  console.log(`Seeding ${DOCUMENTS.length} RAG documents (keyword mode, no embeddings)...`)

  for (const doc of DOCUMENTS) {
    const existing = await prisma.ragDocument.findFirst({ where: { source: doc.source } })
    if (existing) {
      console.log(`  Skip (exists): ${doc.title}`)
      continue
    }

    const chunks = chunkText(doc.content)
    const document = await prisma.ragDocument.create({
      data: { title: doc.title, source: doc.source, content: doc.content, chunkCount: chunks.length },
    })

    for (let i = 0; i < chunks.length; i++) {
      await prisma.ragChunk.create({
        data: {
          documentId: document.id,
          chunkIndex: i,
          content: chunks[i],
          // embedding left null — keyword fallback in rag-search.ts handles this
        },
      })
    }
    console.log(`  Done: ${doc.title} (${chunks.length} chunk${chunks.length > 1 ? 's' : ''})`)
  }

  console.log('\nRAG keyword seed complete. Run node scripts/seed-rag-keyword.mjs again to skip already-seeded docs.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
