import { Meilisearch } from 'meilisearch'
import prisma from '@/lib/db'
import { parseTags } from '@/lib/utils'
import type { PostMeta } from '@/types'

const INDEX_UID = 'posts'

export type SearchEngine = 'meilisearch' | 'sqlite'

export interface SearchHighlight {
  title?: string
  summary?: string
}

export interface SearchPostMeta extends PostMeta {
  highlight?: SearchHighlight
}

export interface SearchQuery {
  q?: string
  tag?: string
  category?: string
  series?: string
  recent?: boolean
  limit?: number
}

export interface SearchResponse {
  posts: SearchPostMeta[]
  total: number
  engine: SearchEngine
}

export function isSearchEnabled(): boolean {
  return !!(process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY)
}

let client: Meilisearch | null = null

function getClient(): Meilisearch | null {
  if (!isSearchEnabled()) return null
  if (!client) {
    client = new Meilisearch({
      host: process.env.MEILISEARCH_HOST!,
      apiKey: process.env.MEILISEARCH_API_KEY!,
    })
  }
  return client
}

interface IndexDocument {
  id: string
  title: string
  summary: string | null
  content: string
  category: string
  subcategory: string | null
  series: string | null
  tags: string[]
  status: string
  publishedAt: number | null
}

function postToDocument(post: {
  id: string
  title: string
  summary: string | null
  content: string
  category: string
  subcategory: string | null
  series: string | null
  tags: string
  status: string
  publishedAt: Date | null
}): IndexDocument {
  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    content: post.content.slice(0, 12_000),
    category: post.category,
    subcategory: post.subcategory,
    series: post.series,
    tags: parseTags(post.tags),
    status: post.status,
    publishedAt: post.publishedAt ? post.publishedAt.getTime() : null,
  }
}

export async function ensureSearchIndex(): Promise<boolean> {
  const meili = getClient()
  if (!meili) return false

  try {
    await meili.createIndex(INDEX_UID, { primaryKey: 'id' })
  } catch {
    // 索引已存在
  }

  await meili.index(INDEX_UID).updateSettings({
    searchableAttributes: ['title', 'summary', 'content', 'tags'],
    filterableAttributes: ['category', 'series', 'status', 'tags'],
    sortableAttributes: ['publishedAt'],
    displayedAttributes: [
      'id',
      'title',
      'summary',
      'category',
      'subcategory',
      'series',
      'tags',
      'status',
      'publishedAt',
    ],
  })

  return true
}

export async function indexPostById(id: string): Promise<void> {
  const meili = getClient()
  if (!meili) return

  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) return

  await ensureSearchIndex()

  if (post.status === 'PUBLISHED') {
    const task = await meili.index(INDEX_UID).addDocuments([postToDocument(post)])
    if (task.taskUid != null) {
      await meili.tasks.waitForTask(task.taskUid)
    }
  } else {
    await removePostFromIndex(id)
  }
}

export async function removePostFromIndex(id: string): Promise<void> {
  const meili = getClient()
  if (!meili) return

  try {
    await meili.index(INDEX_UID).deleteDocument(id)
  } catch {
    // 索引不存在或文档缺失时忽略
  }
}

export async function reindexAllPosts(): Promise<{ indexed: number }> {
  const meili = getClient()
  if (!meili) return { indexed: 0 }

  await ensureSearchIndex()

  const posts = await prisma.post.findMany({ where: { status: 'PUBLISHED' } })
  const docs = posts.map(postToDocument)

  if (docs.length > 0) {
    const task = await meili.index(INDEX_UID).addDocuments(docs)
    if (task.taskUid != null) {
      await meili.tasks.waitForTask(task.taskUid)
    }
  }

  return { indexed: docs.length }
}

export async function getSearchIndexStats(): Promise<{ enabled: boolean; documentCount: number | null }> {
  const meili = getClient()
  if (!meili) return { enabled: false, documentCount: null }

  try {
    const stats = await meili.index(INDEX_UID).getStats()
    return { enabled: true, documentCount: stats.numberOfDocuments }
  } catch {
    return { enabled: true, documentCount: null }
  }
}

function buildMeiliFilter(params: SearchQuery): string[] {
  const filters = ['status = "PUBLISHED"']
  if (params.category) filters.push(`category = "${params.category}"`)
  if (params.series) filters.push(`series = "${params.series}"`)
  if (params.tag) filters.push(`tags = "${params.tag}"`)
  return filters
}

async function searchWithMeilisearch(params: SearchQuery): Promise<SearchResponse | null> {
  const meili = getClient()
  if (!meili) return null

  try {
    await ensureSearchIndex()
    const limit = params.limit ?? (params.recent ? 8 : 50)
    const q = params.q?.trim() ?? ''
    const filter = buildMeiliFilter(params).join(' AND ')

    const result = await meili.index(INDEX_UID).search(q, {
      limit,
      filter,
      sort: q ? undefined : ['publishedAt:desc'],
      attributesToHighlight: ['title', 'summary'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    })

    const ids = result.hits.map((h) => h.id as string)
    if (ids.length === 0) {
      return { posts: [], total: 0, engine: 'meilisearch' }
    }

    const dbPosts = await prisma.post.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
        subcategory: true,
        series: true,
        tags: true,
        status: true,
        readingTime: true,
        viewCount: true,
        createdAt: true,
        publishedAt: true,
      },
    })

    const postMap = new Map(dbPosts.map((p) => [p.id, p]))

    const posts = ids
      .map((id) => {
        const p = postMap.get(id)
        if (!p) return null
        const hit = result.hits.find((h) => h.id === id)
        const formatted = hit?._formatted as { title?: string; summary?: string } | undefined
        const item: SearchPostMeta = {
          ...p,
          tags: parseTags(p.tags as string),
          status: p.status as 'DRAFT' | 'PUBLISHED',
          highlight: formatted
            ? { title: formatted.title, summary: formatted.summary }
            : undefined,
        }
        return item
      })
      .filter((p): p is SearchPostMeta => p !== null)

    return {
      posts,
      total: result.estimatedTotalHits ?? posts.length,
      engine: 'meilisearch',
    }
  } catch (error) {
    console.error('Meilisearch search error:', error)
    return null
  }
}

async function searchWithSqlite(params: SearchQuery): Promise<SearchResponse> {
  const q = params.q?.trim() ?? ''
  const tag = params.tag?.trim() ?? ''
  const category = params.category?.trim() ?? ''
  const series = params.series?.trim() ?? ''
  const recent = params.recent ?? false
  const limit = params.limit ?? (recent ? 8 : 50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: 'PUBLISHED' }

  if (category) where.category = category
  if (series) where.series = series

  if (q || tag) {
    const conditions = []
    if (q) {
      conditions.push(
        { title: { contains: q } },
        { summary: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } }
      )
    }
    if (tag) {
      conditions.push({ tags: { contains: `"${tag}"` } })
    }
    if (conditions.length > 0) {
      where.OR = conditions
    }
  } else if (!recent && !category && !series) {
    return { posts: [], total: 0, engine: 'sqlite' }
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      subcategory: true,
      series: true,
      tags: true,
      status: true,
      readingTime: true,
      viewCount: true,
      createdAt: true,
      publishedAt: true,
    },
  })

  const result: SearchPostMeta[] = posts.map((p) => ({
    ...p,
    tags: parseTags(p.tags as string),
    status: p.status as 'DRAFT' | 'PUBLISHED',
  }))

  return { posts: result, total: result.length, engine: 'sqlite' }
}

/** Meilisearch 优先，不可用时回退 SQLite */
export async function searchPosts(params: SearchQuery): Promise<SearchResponse> {
  if (!params.recent && !params.q && !params.tag && !params.category && !params.series) {
    return { posts: [], total: 0, engine: isSearchEnabled() ? 'meilisearch' : 'sqlite' }
  }

  const meiliResult = await searchWithMeilisearch(params)
  if (meiliResult) return meiliResult

  return searchWithSqlite(params)
}
