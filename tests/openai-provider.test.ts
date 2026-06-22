import { describe, it, expect, vi, afterEach } from 'vitest'
import { OpenAIProvider } from '@/services/ai/openai'

describe('OpenAIProvider', () => {
  const origFetch = global.fetch

  afterEach(() => {
    global.fetch = origFetch
    vi.restoreAllMocks()
  })

  it('throws on non-OK chat response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"error":"invalid key"}',
    }) as typeof fetch

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-test',
    })

    await expect(
      provider.chat([{ role: 'user', content: 'hello' }])
    ).rejects.toThrow(/LLM API 错误 \(401\)/)
  })

  it('throws when response has no content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: {} }] }),
    }) as typeof fetch

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-test',
    })

    await expect(
      provider.chat([{ role: 'user', content: 'hello' }])
    ).rejects.toThrow(/返回空内容/)
  })

  it('returns content on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: '你好' } }],
        }),
    }) as typeof fetch

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-test',
    })

    const answer = await provider.chat([{ role: 'user', content: 'hi' }])
    expect(answer).toBe('你好')
  })
})
