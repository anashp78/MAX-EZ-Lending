import { prisma } from '@/lib/db'
import type { RagSearchResult } from '@/types'

async function keywordSearch(query: string, topK: number): Promise<Array<{ content: string; source: string; similarity: number }>> {
  // Extract meaningful keywords — skip common stop words
  const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !['with','that','this','from','have','will','what','your','been','they','their'].includes(w))
  if (!words.length) return []

  const chunks = await prisma.ragChunk.findMany({
    take: topK * 3,
    include: { document: { select: { source: true } } },
  })

  const scored = chunks.map(c => {
    const text = c.content.toLowerCase()
    const hits = words.filter(w => text.includes(w)).length
    return { content: c.content, source: c.document.source, similarity: hits / words.length }
  })

  return scored
    .filter(r => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}

async function vectorSearch(query: string, topK: number): Promise<Array<{ content: string; source: string; similarity: number }>> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const embeddingRes = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query })
  const vector = `[${embeddingRes.data[0].embedding.join(',')}]`

  return prisma.$queryRaw<Array<{ content: string; source: string; similarity: number }>>`
    SELECT rc.content, rd.source, 1 - (rc.embedding <=> ${vector}::vector) AS similarity
    FROM "RagChunk" rc
    JOIN "RagDocument" rd ON rc."documentId" = rd.id
    WHERE rc.embedding IS NOT NULL
    ORDER BY rc.embedding <=> ${vector}::vector
    LIMIT ${topK}
  `
}

export async function ragSearch(query: string, topK = 5): Promise<RagSearchResult> {
  let chunks: Array<{ content: string; source: string; similarity: number }> = []

  if (process.env.OPENAI_API_KEY) {
    try {
      chunks = await vectorSearch(query, topK)
    } catch {
      chunks = await keywordSearch(query, topK)
    }
  } else {
    chunks = await keywordSearch(query, topK)
  }

  const summary = chunks
    .filter(c => c.similarity > 0.1)
    .map(c => c.content)
    .join('\n\n')
    .substring(0, 2000)

  return { chunks, summary: summary || 'No relevant lending guidelines found.' }
}
