import { unstable_cache } from 'next/cache'
import prisma from '@/lib/db'
import { parseTags } from '@/lib/utils'
import { CACHE_TAG, PAGE_REVALIDATE } from '@/lib/cache-tags'
import { getPostAdjacency, getSeriesPosts } from '@/lib/post-navigation'
import { getSeriesCatalog } from '@/lib/series-catalog'
import { buildWikiSlugMap } from '@/lib/wiki-links'
import type { PostMeta } from '@/types'
import type { Post } from '@prisma/client'

const postListSelect = {
  id: true,
  title: true,
  summary: true,
  category: true,
  subcategory: true,
  series: true,
  seriesOrder: true,
  wordCount: true,
  tags: true,
  status: true,
  readingTime: true,
  viewCount: true,
  createdAt: true,
  publishedAt: true,
} as const

type PostListRow = {
  id: string
  title: string
  summary: string | null
  category: string
  subcategory: string | null
  series: string | null
  seriesOrder?: number | null
  wordCount: number | null
  tags: string
  status: string
  readingTime: number | null
  viewCount: number
  createdAt: Date
  publishedAt: Date | null
}

function toPostMeta(p: PostListRow): PostMeta {
  return {
    ...p,
    tags: parseTags(p.tags),
    status: p.status as 'DRAFT' | 'PUBLISHED',
  }
}

function reviveDates<T extends {
  createdAt: Date | string
  publishedAt?: Date | string | null
  updatedAt?: Date | string
}>(row: T): T {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    publishedAt: row.publishedAt != null ? new Date(row.publishedAt) : null,
    ...(row.updatedAt != null ? { updatedAt: new Date(row.updatedAt) } : {}),
  }
}

function revivePostList(posts: PostMeta[]): PostMeta[] {
  return posts.map((p) => reviveDates(p))
}

export async function getHomePostsPage(page: number, pageSize: number) {
  const result = await unstable_cache(
    async () => {
      const skip = (page - 1) * pageSize
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          skip,
          take: pageSize,
          select: postListSelect,
        }),
        prisma.post.count({ where: { status: 'PUBLISHED' } }),
      ])
      return {
        posts: posts.map((p) => toPostMeta(p)),
        total,
      }
    },
    [`home-posts-${page}-${pageSize}`],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.home],
      revalidate: PAGE_REVALIDATE.home,
    }
  )()
  return { ...result, posts: revivePostList(result.posts) }
}

/** 首页列表：可选按标签筛选（分页在筛选后切片） */
export async function getHomePostsPageFiltered(
  page: number,
  pageSize: number,
  tag?: string
) {
  const trimmed = tag?.trim()
  if (!trimmed) return getHomePostsPage(page, pageSize)

  const result = await unstable_cache(
    async () => {
      const rows = await prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        select: postListSelect,
      })
      const filtered = rows
        .map((p) => toPostMeta(p))
        .filter((p) => (p.tags as string[]).includes(trimmed))
      const skip = (page - 1) * pageSize
      return {
        posts: filtered.slice(skip, skip + pageSize),
        total: filtered.length,
      }
    },
    [`home-posts-tag-${trimmed}-${page}-${pageSize}`],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.home],
      revalidate: PAGE_REVALIDATE.home,
    }
  )()
  return { ...result, posts: revivePostList(result.posts) }
}

export interface HomeSummary {
  publishedCount: number
  categoryCount: number
  latestUpdatedAt: Date | null
}

export async function getHomeSummaryCached(): Promise<HomeSummary> {
  const summary = await unstable_cache(
    async () => {
      const [publishedCount, categories, latest] = await Promise.all([
        prisma.post.count({ where: { status: 'PUBLISHED' } }),
        prisma.post.findMany({
          where: { status: 'PUBLISHED' },
          select: { category: true },
          distinct: ['category'],
        }),
        prisma.post.findFirst({
          where: { status: 'PUBLISHED' },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ])
      return {
        publishedCount,
        categoryCount: categories.length,
        latestUpdatedAt: latest?.updatedAt ?? null,
      }
    },
    ['home-summary'],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.home],
      revalidate: PAGE_REVALIDATE.home,
    }
  )()
  return {
    ...summary,
    latestUpdatedAt: summary.latestUpdatedAt ? new Date(summary.latestUpdatedAt) : null,
  }
}

export const CATEGORY_PAGE_SIZE = 24

export async function getCategorySummaryCached(categoryId: string) {
  return unstable_cache(
    async () => {
      const [total, seriesRows] = await Promise.all([
        prisma.post.count({ where: { status: 'PUBLISHED', category: categoryId } }),
        prisma.post.findMany({
          where: { status: 'PUBLISHED', category: categoryId, series: { not: null } },
          select: { series: true },
          distinct: ['series'],
        }),
      ])
      return { total, seriesCount: seriesRows.filter((r) => r.series?.trim()).length }
    },
    [`category-summary-${categoryId}`],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.category(categoryId)],
      revalidate: PAGE_REVALIDATE.category,
    }
  )()
}

export async function getCategoryPostsPageCached(
  categoryId: string,
  page: number,
  pageSize: number
) {
  const posts = await unstable_cache(
    async () => {
      const skip = (page - 1) * pageSize
      const rows = await prisma.post.findMany({
        where: { status: 'PUBLISHED', category: categoryId },
        orderBy: [{ series: 'asc' }, { seriesOrder: 'asc' }, { publishedAt: 'desc' }],
        skip,
        take: pageSize,
        select: postListSelect,
      })
      return rows.map((p) => toPostMeta(p))
    },
    [`category-posts-${categoryId}-${page}-${pageSize}`],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.category(categoryId)],
      revalidate: PAGE_REVALIDATE.category,
    }
  )()
  return revivePostList(posts)
}

export async function getPublishedPostCached(slug: string): Promise<Post | null> {
  const post = await unstable_cache(
    async () => {
      return prisma.post.findUnique({
        where: { id: slug, status: 'PUBLISHED' },
      })
    },
    [`published-post-${slug}`],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.post(slug)],
      revalidate: PAGE_REVALIDATE.post,
    }
  )()
  return post ? reviveDates(post) : null
}

export async function getRelatedPostsCached(
  postId: string,
  category: string,
  series: string | null
): Promise<PostMeta[]> {
  const key = `related-${postId}-${category}-${series ?? 'none'}`
  const related = await unstable_cache(
    async () => {
      const seriesName = series?.trim() || null
      const rows: PostMeta[] = []

      if (seriesName) {
        const inSeries = await prisma.post.findMany({
          where: { status: 'PUBLISHED', category, series: seriesName, id: { not: postId } },
          orderBy: [{ seriesOrder: 'asc' }, { publishedAt: 'desc' }],
          take: 4,
          select: postListSelect,
        })
        rows.push(...inSeries.map((p) => toPostMeta(p)))
      }

      if (rows.length < 4) {
        const more = await prisma.post.findMany({
          where: {
            status: 'PUBLISHED',
            category,
            id: { notIn: [postId, ...rows.map((p) => p.id)] },
          },
          orderBy: { publishedAt: 'desc' },
          take: 4 - rows.length,
          select: postListSelect,
        })
        rows.push(...more.map((p) => toPostMeta(p)))
      }

      return rows.slice(0, 4)
    },
    [key],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.post(postId)],
      revalidate: PAGE_REVALIDATE.post,
    }
  )()
  return revivePostList(related)
}

export async function getPostAdjacencyCached(
  postId: string,
  category: string,
  series: string | null
) {
  return unstable_cache(
    async () => getPostAdjacency(postId, category, series),
    [`adjacency-${postId}`],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.post(postId)],
      revalidate: PAGE_REVALIDATE.post,
    }
  )()
}

export async function getSeriesPostsCached(category: string, series: string) {
  return unstable_cache(
    async () => getSeriesPosts(category, series),
    [`series-posts-${category}-${series}`],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.category(category)],
      revalidate: PAGE_REVALIDATE.post,
    }
  )()
}

export async function getWikiSlugMapCached(): Promise<Record<string, string>> {
  return unstable_cache(
    async () => buildWikiSlugMap(),
    ['wiki-slug-map'],
    {
      tags: [CACHE_TAG.posts],
      revalidate: PAGE_REVALIDATE.post,
    }
  )()
}

export async function getSeriesCatalogCached(limit = 8) {
  return unstable_cache(
    async () => getSeriesCatalog(limit),
    [`series-catalog-${limit}`],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.sidebar],
      revalidate: PAGE_REVALIDATE.home,
    }
  )()
}

export async function getSidebarDataCached() {
  return unstable_cache(
    async () => {
      const [stats, posts] = await Promise.all([
        prisma.post.groupBy({
          by: ['category'],
          where: { status: 'PUBLISHED' },
          _count: { id: true },
        }),
        prisma.post.findMany({
          where: { status: 'PUBLISHED' },
          select: { tags: true },
        }),
      ])

      const categoryStats = Object.fromEntries(
        stats.map((s) => [s.category, s._count.id])
      )

      const tagCount: Record<string, number> = {}
      for (const post of posts) {
        try {
          const tags: string[] = JSON.parse(post.tags)
          for (const tag of tags) {
            tagCount[tag] = (tagCount[tag] ?? 0) + 1
          }
        } catch {
          /* ignore */
        }
      }

      const popularTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }))

      return { categoryStats, popularTags }
    },
    ['sidebar-data'],
    {
      tags: [CACHE_TAG.posts, CACHE_TAG.sidebar],
      revalidate: PAGE_REVALIDATE.home,
    }
  )()
}
