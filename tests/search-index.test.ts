import { describe, it, expect, afterEach } from 'vitest'
import { escapeMeiliFilterValue, isSearchEnabled } from '@/lib/search-index'

describe('search-index', () => {
  const origHost = process.env.MEILISEARCH_HOST
  const origKey = process.env.MEILISEARCH_API_KEY

  afterEach(() => {
    if (origHost === undefined) delete process.env.MEILISEARCH_HOST
    else process.env.MEILISEARCH_HOST = origHost
    if (origKey === undefined) delete process.env.MEILISEARCH_API_KEY
    else process.env.MEILISEARCH_API_KEY = origKey
  })

  it('escapes quotes and backslashes in filter values', () => {
    expect(escapeMeiliFilterValue('a"b')).toBe('a\\"b')
    expect(escapeMeiliFilterValue('path\\to')).toBe('path\\\\to')
  })

  it('detects search enabled when env is set', () => {
    process.env.MEILISEARCH_HOST = 'http://localhost:7700'
    process.env.MEILISEARCH_API_KEY = 'test-key'
    expect(isSearchEnabled()).toBe(true)
  })

  it('detects search disabled when env missing', () => {
    delete process.env.MEILISEARCH_HOST
    delete process.env.MEILISEARCH_API_KEY
    expect(isSearchEnabled()).toBe(false)
  })
})
