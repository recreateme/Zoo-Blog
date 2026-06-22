import { describe, it, expect, beforeEach } from 'vitest'
import { consumeRateLimit, resetRateLimitStore } from '@/lib/rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  it('allows requests within limit', () => {
    expect(consumeRateLimit('test', 3, 60_000).ok).toBe(true)
    expect(consumeRateLimit('test', 3, 60_000).ok).toBe(true)
    expect(consumeRateLimit('test', 3, 60_000).ok).toBe(true)
  })

  it('blocks when limit exceeded', () => {
    consumeRateLimit('block', 2, 60_000)
    consumeRateLimit('block', 2, 60_000)
    const result = consumeRateLimit('block', 2, 60_000)
    expect(result.ok).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })
})
