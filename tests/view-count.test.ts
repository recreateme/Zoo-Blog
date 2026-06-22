import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordView,
  resetViewCountBuffer,
  getPendingViewCounts,
} from '@/lib/view-count'

describe('view-count buffer', () => {
  beforeEach(() => {
    resetViewCountBuffer()
  })

  it('accumulates views without immediate DB write', () => {
    recordView('post-a')
    recordView('post-a')
    recordView('post-b')
    const pending = getPendingViewCounts()
    expect(pending.get('post-a')).toBe(2)
    expect(pending.get('post-b')).toBe(1)
  })
})
