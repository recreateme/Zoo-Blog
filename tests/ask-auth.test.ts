import { describe, it, expect, afterEach } from 'vitest'
import { isAskPublic } from '@/lib/ask-auth'

describe('ask-auth', () => {
  const orig = process.env.ASK_PUBLIC

  afterEach(() => {
    process.env.ASK_PUBLIC = orig
  })

  it('defaults to requiring login', () => {
    delete process.env.ASK_PUBLIC
    expect(isAskPublic()).toBe(false)
  })

  it('allows public when ASK_PUBLIC=true', () => {
    process.env.ASK_PUBLIC = 'true'
    expect(isAskPublic()).toBe(true)
  })
})
