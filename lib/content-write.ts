import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { resolveContentFilePath } from '@/lib/content-source'
import type { SeriesMembershipInput } from '@/lib/series-ops'

const CONTENT_DIR = process.env.CONTENT_DIR ?? './content'

export interface MarkdownFrontmatterWrite {
  title: string
  slug: string
  tags: string[]
  status: 'draft' | 'published'
  summary?: string | null
  outline?: string[]
  subcategory?: string | null
  series?: SeriesMembershipInput[]
  cover?: string | null
  publishedAt?: Date | string | null
}

/** 相对 content/ 的路径，如 notes/my-slug.md */
export function buildRelativeContentPath(slug: string, subdir = ''): string {
  const safeSlug = slug.replace(/[^a-zA-Z0-9_\u4e00-\u9fff.-]/g, '-').replace(/-+/g, '-')
  const dir = subdir
    .replace(/\\/g, '/')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p && p !== '.' && p !== '..')
    .join('/')
  return dir ? `${dir}/${safeSlug}.md` : `${safeSlug}.md`
}

export function stringifyMarkdownFile(
  frontmatter: MarkdownFrontmatterWrite,
  body: string
): string {
  const data: Record<string, unknown> = {
    title: frontmatter.title,
    slug: frontmatter.slug,
    tags: frontmatter.tags,
    status: frontmatter.status,
  }
  if (frontmatter.summary) data.summary = frontmatter.summary
  if (frontmatter.outline?.length) data.outline = frontmatter.outline
  if (frontmatter.subcategory) data.subcategory = frontmatter.subcategory
  if (frontmatter.cover) data.cover = frontmatter.cover
  if (frontmatter.publishedAt) {
    const d =
      frontmatter.publishedAt instanceof Date
        ? frontmatter.publishedAt.toISOString().slice(0, 10)
        : String(frontmatter.publishedAt).slice(0, 10)
    data.publishedAt = d
  }
  if (frontmatter.series?.length) {
    data.series = frontmatter.series.map((m) =>
      m.order != null ? { name: m.name, order: m.order } : { name: m.name }
    )
  }

  return matter.stringify(body.replace(/^\uFEFF/, ''), data)
}

/** 写入 content/ 并返回相对路径（用于 Post.filePath） */
export async function writeMarkdownToContent(
  relativePath: string,
  frontmatter: MarkdownFrontmatterWrite,
  body: string
): Promise<string> {
  const absolute = resolveContentFilePath(relativePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })
  const raw = stringifyMarkdownFile(frontmatter, body)
  await fs.writeFile(absolute, raw, 'utf-8')
  return relativePath.replace(/\\/g, '/')
}

export function contentDirAbsolute(): string {
  return path.resolve(CONTENT_DIR)
}
