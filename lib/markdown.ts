import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'
import matter from 'gray-matter'
import { type TocItem, type ParsedMarkdown, type MarkdownFrontmatter } from '@/types'
import { computePostStats } from './utils'
import { createHeadingSlugger, slugifyHeading } from './heading-slug'
import { ensureTags, parseSeriesMemberships } from './series-ops'

// ============================================================
// Markdown → HTML 转换
// ============================================================
export async function parseMarkdown(raw: string): Promise<ParsedMarkdown> {
  // 1. 解析 frontmatter
  const { content: markdownContent, data } = matter(raw)

  // 2. 提取 TOC（在处理前扫描标题）
  const toc = extractToc(markdownContent)

  // 3. 使用 unified 流水线转换
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex, { strict: false })
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: { className: ['anchor-link'] },
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdownContent)

  return {
    content: String(result),
    toc,
    frontmatter: data as MarkdownFrontmatter,
  }
}

// ============================================================
// 从 Markdown 原文提取目录结构
// ============================================================
export function extractToc(markdown: string): TocItem[] {
  // 去掉围栏代码块，避免 Python/Shell 注释 `# ...` 被当成标题
  const withoutFenced = markdown.replace(/```[\s\S]*?```/g, '')
  const headingRegex = /^(#{1,4})\s+(.+)$/gm
  const flat: TocItem[] = []
  const slugger = createHeadingSlugger()
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(withoutFenced)) !== null) {
    const level = match[1].length
    const raw = match[2].trim()
    const text = raw.replace(/[*_`]/g, '').trim()
    if (!text) continue
    const id = slugifyHeading(raw, slugger)

    flat.push({ id, text, level, children: [] })
  }

  return buildTocTree(flat)
}

function buildTocTree(flat: TocItem[]): TocItem[] {
  const root: TocItem[] = []
  const stack: TocItem[] = []

  for (const item of flat) {
    const node = { ...item, children: [] }

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }

    stack.push(node)
  }

  return root
}

// ============================================================
// 解析 Frontmatter（仅提取元数据，不处理正文）
// ============================================================
export function parseFrontmatter(raw: string): {
  frontmatter: MarkdownFrontmatter
  content: string
} {
  const { data, content } = matter(raw)
  return { frontmatter: data as MarkdownFrontmatter, content }
}

// ============================================================
// 从文件路径 + 内容生成 Post 元数据
// ============================================================
export function extractPostMeta(raw: string, filePath: string) {
  const { frontmatter, content } = parseFrontmatter(raw)
  const { readingTime, wordCount } = computePostStats(content)

  const memberships = parseSeriesMemberships(
    frontmatter.series,
    frontmatter.seriesOrder ?? frontmatter.order
  )
  const primary = memberships[0] ?? null
  const series = primary?.name ?? null
  const seriesOrder = primary?.order ?? null

  const cover =
    typeof frontmatter.cover === 'string' && frontmatter.cover.trim()
      ? frontmatter.cover.trim()
      : null

  // slug 优先从 frontmatter 取，其次从文件名
  const filename = filePath.split('/').pop()?.replace(/\.md$/, '') ?? 'untitled'
  const id = typeof frontmatter.slug === 'string' ? frontmatter.slug : filename

  const outline = Array.isArray(frontmatter.outline)
    ? frontmatter.outline.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0
      )
    : []

  const tags = ensureTags(Array.isArray(frontmatter.tags) ? frontmatter.tags : [])

  // 迁移期：仍读 category；新文可省略（空字符串）
  const category =
    typeof frontmatter.category === 'string' && frontmatter.category.trim()
      ? frontmatter.category.trim()
      : ''

  return {
    id,
    title: frontmatter.title ?? 'Untitled',
    category,
    subcategory: frontmatter.subcategory ?? null,
    tags,
    status: (frontmatter.status === 'published' ? 'PUBLISHED' : 'DRAFT') as 'DRAFT' | 'PUBLISHED',
    summary: frontmatter.summary ?? null,
    outline,
    series,
    seriesOrder,
    seriesMemberships: memberships,
    coverImage: cover,
    readingTime,
    wordCount,
    filePath,
    publishedAt: frontmatter.publishedAt ? new Date(frontmatter.publishedAt) : null,
  }
}

// ============================================================
// 将双向链接 [[title]] 转换为 HTML 链接
// ============================================================
export function resolveWikiLinks(html: string, slugMap: Record<string, string>): string {
  return html.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const slug = slugMap[title]
    if (slug) {
      return `<a href="/post/${slug}" class="wiki-link">${title}</a>`
    }
    return `<span class="wiki-link-missing">${title}</span>`
  })
}
