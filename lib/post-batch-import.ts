import { isAsciiSlug, slugifyPostId } from '@/lib/post-slug'
import type { SeriesMembershipInput } from '@/lib/series-ops'

export const MAX_BATCH_IMPORT_FILES = 60

export type BatchTargetSeries =
  | { mode: 'existing'; id: string }
  | { mode: 'new'; name: string; description?: string }

export interface BatchImportMeta {
  targetSeries: BatchTargetSeries
  defaultTags: string[]
  subdir?: string
  status: 'DRAFT' | 'PUBLISHED'
  orderStart?: number
  orderStep?: number
}

export interface BatchPreviewItem {
  filename: string
  title: string
  slug: string
  slugConflict: boolean
  tags: string[]
  order: number
  warnings: string[]
}

export interface BatchCommitItem {
  filename: string
  title: string
  slug: string
  tags: string[]
  order: number
}

/** 正文里第一个一级标题，跳过围栏代码块（避免 # 号注释被当标题），取不到返回 null */
export function extractFirstH1(body: string): string | null {
  const withoutFenced = body.replace(/```[\s\S]*?```/g, '')
  const match = /^#\s+(.+)$/m.exec(withoutFenced)
  return match ? match[1].replace(/[*_`]/g, '').trim() || null : null
}

/** 文件名 → 兜底标题：去扩展名、去常见章节序号前缀、下划线/横线转空格 */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.md$/i, '')
  const stripped = base
    .replace(/^(第?\s*\d+\s*[章节讲课]?[-_.\s]*|chapter\s*\d+[-_.\s]*|\d+[-_.\s]+)/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  return stripped || base
}

/** 标题兜底链：frontmatter → 正文首个 H1 → 文件名 */
export function resolveBatchTitle(
  frontmatterTitle: unknown,
  body: string,
  filename: string
): string {
  if (typeof frontmatterTitle === 'string' && frontmatterTitle.trim()) {
    return frontmatterTitle.trim()
  }
  const h1 = extractFirstH1(body)
  if (h1) return h1
  return titleFromFilename(filename)
}

/** 文件名自然排序比较器：让 "2.md" 排在 "10.md" 前面 */
export function naturalFilenameCompare(a: string, b: string): number {
  return a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' })
}

export function isMarkdownFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.md')
}

export function tagsFromFrontmatter(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === 'string')
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,，]/)
  }
  return []
}

export function mergeTagLists(...lists: string[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const raw of list) {
      const tag = raw.trim()
      if (!tag) continue
      const key = tag.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(tag)
    }
  }
  return out
}

export function sanitizeSlugCandidate(raw: string): string {
  return raw
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fff.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function resolveBatchSlug(frontmatterSlug: unknown, title: string): string {
  if (typeof frontmatterSlug === 'string' && frontmatterSlug.trim()) {
    const cleaned = sanitizeSlugCandidate(frontmatterSlug)
    if (cleaned && isAsciiSlug(cleaned)) return cleaned
  }
  return slugifyPostId(title)
}

export function suggestAvailableSlug(
  base: string,
  taken: Set<string>
): { slug: string; slugConflict: boolean } {
  const normalized = sanitizeSlugCandidate(base) || 'post'
  if (!taken.has(normalized)) return { slug: normalized, slugConflict: false }
  let n = 2
  let candidate = `${normalized}-${n}`
  while (taken.has(candidate)) {
    n += 1
    candidate = `${normalized}-${n}`
  }
  return { slug: candidate, slugConflict: true }
}

export function orderFromMemberships(
  memberships: SeriesMembershipInput[],
  fallback: number
): number {
  const own = memberships.find((m) => m.order != null)
  return own?.order ?? fallback
}

export function collectFormFiles(form: FormData): File[] {
  return [...form.getAll('files'), ...form.getAll('files[]')].filter(
    (value): value is File => value instanceof File
  )
}
