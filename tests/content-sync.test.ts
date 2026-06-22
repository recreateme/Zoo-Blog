import { describe, it, expect } from 'vitest'
import {
  shouldDeleteFileBoundPost,
  countOrphanPostsWithIds,
} from '@/lib/content-sync'

describe('content-sync delete logic', () => {
  const disk = new Set(['/a.md', '/b.md'])
  const pathToId = new Map([
    ['/a.md', 'slug-a'],
    ['/b.md', 'slug-b-new'],
  ])

  it('deletes when file removed from disk', () => {
    expect(shouldDeleteFileBoundPost('/gone.md', 'old', disk, pathToId)).toBe(true)
  })

  it('deletes when slug changed for same path', () => {
    expect(shouldDeleteFileBoundPost('/b.md', 'slug-b-old', disk, pathToId)).toBe(true)
  })

  it('keeps valid file-bound post', () => {
    expect(shouldDeleteFileBoundPost('/a.md', 'slug-a', disk, pathToId)).toBe(false)
  })

  it('keeps post when file exists but parse failed', () => {
    expect(
      shouldDeleteFileBoundPost(
        '/broken.md',
        'some-id',
        new Set(['/broken.md']),
        new Map()
      )
    ).toBe(false)
  })

  it('counts orphan file-bound posts', () => {
    const orphans = countOrphanPostsWithIds(
      [
        { id: 'slug-a', filePath: '/a.md' },
        { id: 'slug-b-old', filePath: '/b.md' },
        { id: 'gone', filePath: '/gone.md' },
      ],
      disk,
      pathToId
    )
    expect(orphans).toBe(2)
  })
})
