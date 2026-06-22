import GithubSlugger from 'github-slugger'

/** 剥离 Markdown 行内格式，与正文标题文本对齐 */
export function cleanHeadingText(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
}

/**
 * 与 rehype-slug / github-slugger 一致的标题 ID。
 * 传入同一 slugger 实例可在文档内自动处理重复标题（-1、-2…）。
 */
export function slugifyHeading(raw: string, slugger: GithubSlugger): string {
  const text = cleanHeadingText(raw)
  return text ? slugger.slug(text) : 'section'
}

export function createHeadingSlugger(): GithubSlugger {
  return new GithubSlugger()
}
