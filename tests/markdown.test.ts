import { describe, it, expect } from 'vitest'
import { extractToc, extractPostMeta, resolveWikiLinks } from '@/lib/markdown'

describe('markdown', () => {
  it('extracts nested TOC with matching slugs', () => {
    const md = `# Title\n\n## First\n\n### Sub\n\n## First\n`
    const toc = extractToc(md)
    expect(toc).toHaveLength(1)
    expect(toc[0].id).toBe('title')
    expect(toc[0].children[0].id).toBe('first')
    expect(toc[0].children[0].children[0].id).toBe('sub')
    expect(toc[0].children[1].id).toBe('first-1')
  })

  it('ignores headings inside fenced code blocks', () => {
    const md = `# Title\n\n\`\`\`python\n# ROI crop\nx = 1\n\`\`\`\n\n## Real\n`
    const toc = extractToc(md)
    expect(toc).toHaveLength(1)
    expect(toc[0].children.map((c) => c.text)).toEqual(['Real'])
  })

  it('parses frontmatter into post meta', () => {
    const raw = `---
title: Test Post
slug: my-slug
category: ai
series: LLM 基础
seriesOrder: 2
status: published
tags: [nlp, llm]
outline: [要点一, 要点二]
---
# Body
`
    const meta = extractPostMeta(raw, '/ai/my-file.md')
    expect(meta.id).toBe('my-slug')
    expect(meta.title).toBe('Test Post')
    expect(meta.category).toBe('ai')
    expect(meta.series).toBe('LLM 基础')
    expect(meta.seriesOrder).toBe(2)
    expect(meta.status).toBe('PUBLISHED')
    expect(meta.tags).toEqual(['nlp', 'llm'])
    expect(meta.outline).toEqual(['要点一', '要点二'])
    expect(meta.wordCount).toBeGreaterThan(0)
  })

  it('resolves wiki links to post URLs', () => {
    const html = resolveWikiLinks('See [[Other Note]]', { 'Other Note': 'other-note' })
    expect(html).toContain('href="/post/other-note"')
    expect(html).toContain('wiki-link')
  })

  it('marks missing wiki links', () => {
    const html = resolveWikiLinks('[[Missing]]', {})
    expect(html).toContain('wiki-link-missing')
  })
})
