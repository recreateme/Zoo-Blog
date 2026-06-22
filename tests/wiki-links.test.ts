import { describe, it, expect } from 'vitest'
import { preprocessWikiLinksInMarkdown } from '@/lib/wiki-links'

describe('wiki-links', () => {
  const slugMap = {
    '目标笔记': 'target-slug',
    'target-slug': 'target-slug',
  }

  it('converts resolved wiki links to markdown links', () => {
    const md = '参见 [[目标笔记]] 与 [[target-slug]]'
    const out = preprocessWikiLinksInMarkdown(md, slugMap)
    expect(out).toContain('[目标笔记](/post/target-slug)')
    expect(out).toContain('[target-slug](/post/target-slug)')
  })

  it('keeps unresolved wiki links as-is', () => {
    const md = '未知 [[不存在的笔记]]'
    const out = preprocessWikiLinksInMarkdown(md, slugMap)
    expect(out).toContain('[[不存在的笔记]]')
  })
})
