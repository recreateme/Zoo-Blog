import { describe, it, expect, afterEach } from 'vitest'
import { isEmbeddingConfigured } from '@/lib/embeddings'

describe('embeddings', () => {
  const envBackup = { ...process.env }

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('is false without any embedding credentials', () => {
    delete process.env.EMBEDDING_PROVIDER
    delete process.env.EMBEDDING_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OLLAMA_BASE_URL
    expect(isEmbeddingConfigured()).toBe(false)
  })

  it('is true with OpenRouter key', () => {
    delete process.env.EMBEDDING_PROVIDER
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    expect(isEmbeddingConfigured()).toBe(true)
  })

  it('ollama provider does not require API key', () => {
    process.env.EMBEDDING_PROVIDER = 'ollama'
    expect(isEmbeddingConfigured()).toBe(true)
  })

  it('OLLAMA_BASE_URL alone does not enable embedding', () => {
    delete process.env.EMBEDDING_PROVIDER
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.EMBEDDING_API_KEY
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    expect(isEmbeddingConfigured()).toBe(false)
  })
})
