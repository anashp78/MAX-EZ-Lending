import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import type { RagSearchResult } from '@/types'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function ragSearch(query: string, topK = 5): Promise<RagSearchResult> {
  const embeddingRes = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  })
  const embedding = embeddingRes.data[0].embedding
  const vector = `[${embedding.join(',')}]`

  const chunks = await prisma.$queryRaw<Array<{ content: string; source: string; similarity: number }>>`
    SELECT rc.content, rd.source, 1 - (rc.embedding <=> ${vector}::vector) AS similarity
    FROM "RagChunk" rc
    JOIN "RagDocument" rd ON rc."documentId" = rd.id
    ORDER BY rc.embedding <=> ${vector}::vector
    LIMIT ${topK}
  `

  const summary = chunks
    .filter(c => c.similarity > 0.7)
    .map(c => c.content)
    .join('\n\n')
    .substring(0, 2000)

  return { chunks, summary: summary || 'No highly relevant guidelines found.' }
}
