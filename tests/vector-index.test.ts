import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  chunkPointId,
  isRagEnabled,
  getVectorMinScore,
  resetVectorCollectionCache,
} from '@/lib/vector-index'
import { isEmbeddingConfigured } from '@/lib/embeddings'

describe('vector-index helpers', () => {
  const origQdrant = process.env.QDRANT_URL
  const origOpenAI = process.env.OPENAI_API_KEY
  const origEmbedding = process.env.EMBEDDING_API_KEY
  const origOpenRouter = process.env.OPENROUTER_API_KEY
  const origOllama = process.env.OLLAMA_BASE_URL
  const origEmbeddingProvider = process.env.EMBEDDING_PROVIDER
  const origMinScore = process.env.VECTOR_MIN_SCORE

  beforeEach(() => {
    resetVectorCollectionCache()
  })

  afterEach(() => {
    process.env.QDRANT_URL = origQdrant
    process.env.OPENAI_API_KEY = origOpenAI
    process.env.EMBEDDING_API_KEY = origEmbedding
    process.env.OPENROUTER_API_KEY = origOpenRouter
    process.env.OLLAMA_BASE_URL = origOllama
    process.env.EMBEDDING_PROVIDER = origEmbeddingProvider
    process.env.VECTOR_MIN_SCORE = origMinScore
    resetVectorCollectionCache()
  })

  it('chunkPointId is deterministic UUID format', () => {
    const a = chunkPointId('my-post', 0)
    const b = chunkPointId('my-post', 0)
    const c = chunkPointId('my-post', 1)
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('isRagEnabled requires QDRANT_URL and embedding credentials', () => {
    delete process.env.QDRANT_URL
    delete process.env.OPENAI_API_KEY
    delete process.env.EMBEDDING_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OLLAMA_BASE_URL
    delete process.env.EMBEDDING_PROVIDER
    expect(isEmbeddingConfigured()).toBe(false)
    expect(isRagEnabled()).toBe(false)

    process.env.QDRANT_URL = 'http://localhost:6333'
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    expect(isRagEnabled()).toBe(true)
  })

  it('getVectorMinScore clamps to 0~1', () => {
    delete process.env.VECTOR_MIN_SCORE
    expect(getVectorMinScore()).toBe(0.35)

    process.env.VECTOR_MIN_SCORE = '0.8'
    expect(getVectorMinScore()).toBe(0.8)

    process.env.VECTOR_MIN_SCORE = '2'
    expect(getVectorMinScore()).toBe(1)

    process.env.VECTOR_MIN_SCORE = 'invalid'
    expect(getVectorMinScore()).toBe(0.35)
  })
})
