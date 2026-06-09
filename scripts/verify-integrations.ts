import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check(name: string, fn: () => Promise<string>) {
  try {
    const result = await fn()
    console.log(`✓ ${name}: ${result}`)
  } catch (err) {
    console.log(`✗ ${name}: ${(err as Error).message}`)
  }
}

async function main() {
  console.log('EZ Lending Integration Verification\n')

  await check('PostgreSQL', async () => {
    await prisma.$queryRaw`SELECT 1`
    const tenantCount = await prisma.tenant.count()
    return `connected (${tenantCount} tenants)`
  })

  await check('pgvector', async () => {
    const result = await prisma.$queryRaw<[{ extversion: string }]>`
      SELECT extversion FROM pg_extension WHERE extname = 'vector'
    `
    return `installed v${result[0]?.extversion || 'unknown'}`
  })

  await check('RAG documents', async () => {
    const count = await prisma.ragDocument.count()
    const chunks = await prisma.ragChunk.count()
    return `${count} documents, ${chunks} chunks`
  })

  await check('Anthropic API', async () => {
    if (!process.env.ANTHROPIC_API_KEY) return 'NOT CONFIGURED'
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic()
    const res = await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'ping' }] })
    return `ok (${res.model})`
  })

  await check('OpenAI Embeddings', async () => {
    if (!process.env.OPENAI_API_KEY) return 'NOT CONFIGURED'
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI()
    const res = await client.embeddings.create({ model: 'text-embedding-3-small', input: 'test' })
    return `ok (${res.data[0].embedding.length} dims)`
  })

  await check('Plaid', async () => {
    if (!process.env.PLAID_CLIENT_ID) return 'NOT CONFIGURED'
    return `configured (${process.env.PLAID_ENV} mode)`
  })

  await check('Snowflake', async () => {
    if (!process.env.SNOWFLAKE_ACCOUNT) return 'NOT CONFIGURED'
    return `configured (${process.env.SNOWFLAKE_ACCOUNT})`
  })

  await check('Salesforce', async () => {
    if (!process.env.SF_USERNAME) return 'NOT CONFIGURED'
    return `configured (${process.env.SF_USERNAME})`
  })

  await check('Lendio', async () => {
    if (!process.env.LENDIO_API_KEY) return 'NOT CONFIGURED — will mock'
    return `configured`
  })

  await check('Kapitus', async () => {
    if (!process.env.KAPITUS_API_KEY) return 'NOT CONFIGURED — will mock'
    return `configured`
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
