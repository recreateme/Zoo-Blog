// ============================================================
// 核心数据类型
// ============================================================

export interface PostMeta {
  id: string
  title: string
  summary: string | null
  /** @deprecated 请用 seriesList */
  category: string
  subcategory: string | null
  /** @deprecated 兼容：primary series name */
  series?: string | null
  seriesOrder?: number | null
  /** 多专题归属 */
  seriesList?: { id: string; name: string; order: number | null }[]
  coverImage?: string | null
  wordCount?: number | null
  tags: string[]
  status: 'DRAFT' | 'PUBLISHED'
  readingTime: number | null
  viewCount: number
  createdAt: Date
  publishedAt: Date | null
}

export interface SeriesMeta {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  postCount: number
}

export interface Attachment {
  id: string
  originalName: string
  storedKey: string
  url: string
  type: 'IMAGE' | 'PDF' | 'WORD' | 'OTHER'
  mimeType: string | null
  size: number
  width: number | null
  height: number | null
  postId: string | null
  createdAt: Date | string
}

// ============================================================
// 分类定义（迁移期保留类型；公开站将弃用）
// ============================================================

export interface Category {
  id: string
  name: string
  description: string
  color: string       // Tailwind color class
  bgColor: string     // Tailwind bg class
  icon: string        // emoji 或 icon 名称
  order: number
}

// ============================================================
// Markdown 解析结果
// ============================================================

export interface ParsedMarkdown {
  content: string     // HTML 字符串
  toc: TocItem[]
  frontmatter: MarkdownFrontmatter
}

export interface TocItem {
  id: string
  text: string
  level: number
  children: TocItem[]
}

export interface SeriesFrontmatterItem {
  name: string
  order?: number
}

export interface MarkdownFrontmatter {
  title?: string
  summary?: string
  outline?: string[]
  category?: string
  subcategory?: string
  /** 旧：字符串；新：{name, order}[] 或 string[] */
  series?: string | SeriesFrontmatterItem[] | string[]
  order?: number
  seriesOrder?: number
  cover?: string
  tags?: string[]
  status?: 'draft' | 'published'
  publishedAt?: string
  readingTime?: number
  slug?: string
  [key: string]: unknown
}

// ============================================================
// AI 服务类型
// ============================================================

export interface AiSummaryResult {
  summary: string
  keywords: string[]
}

export interface AiTagsResult {
  tags: string[]
  category?: string
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AskSource {
  postId: string
  title: string
  category: string
  excerpt: string
}

export interface AskResponse {
  answer: string
  sources: AskSource[]
  enabled: boolean
}
