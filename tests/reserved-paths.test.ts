import { describe, it, expect } from 'vitest'
import { isReservedPath, RESERVED_PATHS } from '@/lib/reserved-paths'

describe('reserved-paths', () => {
  it('blocks known static routes', () => {
    for (const path of ['ask', 'search', 'graph', 'post', 'admin']) {
      expect(isReservedPath(path)).toBe(true)
    }
  })

  it('is case insensitive', () => {
    expect(isReservedPath('ASK')).toBe(true)
  })

  it('allows category slugs', () => {
    expect(isReservedPath('ai')).toBe(false)
    expect(isReservedPath('web-dev')).toBe(false)
  })

  it('includes feed paths', () => {
    expect(RESERVED_PATHS.has('rss.xml')).toBe(true)
  })
})
