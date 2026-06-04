// ============================================================
// 核心数据类型
// ============================================================

export interface Post {
  id: string
  title: string
  content: string
  summary: string | null
  outline: string | null
  category: string
  subcategory: string | null
  series: string | null
  seriesOrder: number | null
  wordCount: number | null
  tags: string[]
  status: 'DRAFT' | 'PUBLISHED'
  readingTime: number | null
  filePath: string | null
  viewCount: number
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
}

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
  createdAt: Date
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
// API 请求/响应类型
// ============================================================

export interface PostListParams {
  category?: string
  tag?: string
  status?: 'DRAFT' | 'PUBLISHED'
  search?: string
  page?: number
  pageSize?: number
  orderBy?: 'publishedAt' | 'createdAt' | 'updatedAt' | 'viewCount'
  order?: 'asc' | 'desc'
}

export interface PostListResponse {
  posts: PostMeta[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreatePostInput {
  id: string
  title: string
  content: string
  category: string
  subcategory?: string
  series?: string
  seriesOrder?: number
  tags?: string[]
  status?: 'DRAFT' | 'PUBLISHED'
  summary?: string
  filePath?: string
}

export interface UpdatePostInput {
  title?: string
  content?: string
  category?: string
  subcategory?: string
  series?: string
  seriesOrder?: number
  tags?: string[]
  status?: 'DRAFT' | 'PUBLISHED'
  summary?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
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

// ============================================================
// 仪表盘统计
// ============================================================

export interface DashboardStats {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  totalViews: number
  totalAttachments: number
  postsByCategory: { category: string; count: number }[]
  recentPosts: PostMeta[]
  writingStreak: number
}
