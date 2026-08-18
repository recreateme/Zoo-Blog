import { describe, expect, it } from 'vitest'
import {
  extractFirstH1,
  mergeTagLists,
  naturalFilenameCompare,
  orderFromMemberships,
  resolveBatchSlug,
  resolveBatchTitle,
  suggestAvailableSlug,
  tagsFromFrontmatter,
  titleFromFilename,
} from '@/lib/post-batch-import'

describe('extractFirstH1', () => {
  it('takes the first ATX h1', () => {
    expect(extractFirstH1('intro\n# 真实标题\n## 小节')).toBe('真实标题')
  })

  it('ignores hash comments inside fenced code', () => {
    const body = ['```python', '# not a title', 'print(1)', '```', '', '# 正文标题'].join('\n')
    expect(extractFirstH1(body)).toBe('正文标题')
  })

  it('strips emphasis markers', () => {
    expect(extractFirstH1('# **加粗标题**')).toBe('加粗标题')
  })

  it('returns null when missing', () => {
    expect(extractFirstH1('## 只有二级\n一段话')).toBeNull()
  })
})

describe('titleFromFilename', () => {
  it('strips chapter prefixes and separators', () => {
    expect(titleFromFilename('第1章-OSI模型.md')).toBe('OSI模型')
    expect(titleFromFilename('01-引言.md')).toBe('引言')
    expect(titleFromFilename('10_习题.md')).toBe('习题')
    expect(titleFromFilename('chapter 2 路由.md')).toBe('路由')
  })

  it('keeps a bare numeric filename', () => {
    expect(titleFromFilename('2.md')).toBe('2')
  })
})

describe('resolveBatchTitle', () => {
  it('prefers frontmatter, then h1, then filename', () => {
    expect(resolveBatchTitle('FM', '# H1', 'file.md')).toBe('FM')
    expect(resolveBatchTitle('', '# H1 标题', 'file.md')).toBe('H1 标题')
    expect(resolveBatchTitle(undefined, 'no heading', '01-引言.md')).toBe('引言')
  })
})

describe('naturalFilenameCompare', () => {
  it('sorts numeric chapter names naturally', () => {
    const names = ['10.md', '2.md', '1.md']
    expect([...names].sort(naturalFilenameCompare)).toEqual(['1.md', '2.md', '10.md'])
  })
})

describe('tags and slug helpers', () => {
  it('parses tags from array or comma string', () => {
    expect(tagsFromFrontmatter(['A', ' B ', 3])).toEqual(['A', ' B '])
    expect(tagsFromFrontmatter('网络, 路由，交换')).toEqual(['网络', ' 路由', '交换'])
  })

  it('merges default tags with file tags without case dupes', () => {
    expect(mergeTagLists(['网络'], ['网络', 'CCNA'], ['ccna'])).toEqual(['网络', 'CCNA'])
  })

  it('uses ascii frontmatter slug, otherwise hashes chinese titles', () => {
    expect(resolveBatchSlug('my-note', '标题')).toBe('my-note')
    expect(resolveBatchSlug('中文', '标题')).toMatch(/^post-[0-9a-z]+$/)
    expect(resolveBatchSlug(undefined, '标题')).toMatch(/^post-[0-9a-z]+$/)
  })

  it('suggests -2 when the base slug is taken', () => {
    const taken = new Set(['习题', '习题-2'])
    expect(suggestAvailableSlug('习题', taken)).toEqual({
      slug: '习题-3',
      slugConflict: true,
    })
    expect(suggestAvailableSlug('free', taken)).toEqual({
      slug: 'free',
      slugConflict: false,
    })
  })

  it('keeps explicit series order from frontmatter', () => {
    expect(orderFromMemberships([{ name: 'A', order: 40 }], 10)).toBe(40)
    expect(orderFromMemberships([{ name: 'A', order: null }], 10)).toBe(10)
  })
})
