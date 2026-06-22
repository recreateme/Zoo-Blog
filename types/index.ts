// ============================================================
// 核心数据类型
// ============================================================

export interface PostMeta {
  id: string
  title: string
  summary: string | null
  category: string
  subcategory: string | null
  series?: string | null
  seriesOrder?: number | null
  wordCount?: number | null
  tags: string[]
  status: 'DRAFT' | 'PUBLISHED'
  readingTime: number | null
  viewCount: number
  createdAt: Date
  publishedAt: Date | null
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
// 分类定义
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

export interface MarkdownFrontmatter {
  title?: string
  summary?: string
  outline?: string[]
  category?: string
  subcategory?: string
  series?: string
  order?: number
  seriesOrder?: number
  tags?: string[]
  status?: 'draft' | 'published'
  publishedAt?: string
  readingTime?: number
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
