import { describe, expect, it } from 'vitest'
import {
  ensureTags,
  parseSeriesMemberships,
  slugifySeriesName,
} from '@/lib/series-ops'
import { extractPostMeta } from '@/lib/markdown'

describe('series-ops', () => {
  it('ensureTags fills empty', () => {
    expect(ensureTags([])).toEqual(['未贴标签'])
    expect(ensureTags(['  a ', ''])).toEqual(['a'])
  })

  it('parseSeriesMemberships supports legacy string', () => {
    expect(parseSeriesMemberships('OpenCV', 3)).toEqual([{ name: 'OpenCV', order: 3 }])
  })

  it('parseSeriesMemberships supports array objects', () => {
    expect(
      parseSeriesMemberships([
        { name: 'A', order: 1 },
        { name: 'B' },
        'C',
      ])
    ).toEqual([
      { name: 'A', order: 1 },
      { name: 'B', order: null },
      { name: 'C', order: null },
    ])
  })

  it('slugifySeriesName is stable for ascii', () => {
    expect(slugifySeriesName('OpenCV Notes')).toBe('opencv-notes')
  })

  it('slugifySeriesName uses ascii for chinese names', () => {
    const id = slugifySeriesName('实用工具')
    expect(id).toMatch(/^series-[0-9a-z]+$/)
    expect(slugifySeriesName('实用工具')).toBe(id)
  })
})

describe('extractPostMeta series + cover', () => {
  it('reads multi-series and cover', () => {
    const raw = `---
title: T
slug: t1
tags:
  - x
series:
  - name: Foo
    order: 2
  - name: Bar
cover: /images/c.png
status: published
---

body
`
    const meta = extractPostMeta(raw, '/notes/t1.md')
    expect(meta.id).toBe('t1')
    expect(meta.coverImage).toBe('/images/c.png')
    expect(meta.series).toBe('Foo')
    expect(meta.seriesOrder).toBe(2)
    expect(meta.seriesMemberships).toEqual([
      { name: 'Foo', order: 2 },
      { name: 'Bar', order: null },
    ])
    expect(meta.tags).toEqual(['x'])
  })

  it('defaults empty tags', () => {
    const raw = `---
title: T
status: draft
---

x
`
    const meta = extractPostMeta(raw, '/a.md')
    expect(meta.tags).toEqual(['未贴标签'])
    expect(meta.category).toBe('')
  })
})
