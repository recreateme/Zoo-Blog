import prisma from '@/lib/db'
import type { PostMeta } from '@/types'
import { parseTags } from '@/lib/utils'

export interface SeriesListItem {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  postCount: number
}

function toPostMeta(p: {
  id: string
  title: string
  summary: string | null
  category: string
  subcategory: string | null
  series: string | null
  seriesOrder: number | null
  coverImage: string | null
  wordCount: number | null
  tags: string
  status: string
  readingTime: number | null
  viewCount: number
  createdAt: Date
  publishedAt: Date | null
  seriesLinks?: { order: number | null; series: { id: string; name: string } }[]
}): PostMeta {
  const seriesList =
    p.seriesLinks?.map((l) => ({
      id: l.series.id,
      name: l.series.name,
      order: l.order,
    })) ?? []
  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    category: p.category,
    subcategory: p.subcategory,
    series: seriesList[0]?.name ?? p.series,
    seriesOrder: seriesList[0]?.order ?? p.seriesOrder,
    seriesList,
    coverImage: p.coverImage,
    wordCount: p.wordCount,
    tags: parseTags(p.tags),
    status: p.status as 'DRAFT' | 'PUBLISHED',
    readingTime: p.readingTime,
    viewCount: p.viewCount,
    createdAt: p.createdAt,
    publishedAt: p.publishedAt,
  }
}

const postSelect = {
  id: true,
  title: true,
  summary: true,
  category: true,
  subcategory: true,
  series: true,
  seriesOrder: true,
  coverImage: true,
  wordCount: true,
  tags: true,
  status: true,
  readingTime: true,
  viewCount: true,
  createdAt: true,
  publishedAt: true,
  seriesLinks: {
    select: { order: true, series: { select: { id: true, name: true } } },
  },
} as const

/** 全部专题（含已发布笔记数） */
export async function listSeriesWithCounts(): Promise<SeriesListItem[]> {
  const rows = await prisma.series.findMany({
    orderBy: { name: 'asc' },
    include: {
      posts: {
        where: { post: { status: 'PUBLISHED' } },
        select: { postId: true },
      },
    },
  })
  return rows
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      coverImage: s.coverImage,
      postCount: s.posts.length,
    }))
    .filter((s) => s.postCount > 0)
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name, 'zh-CN'))
}

export async function getSeriesBySlug(slug: string) {
  return prisma.series.findUnique({ where: { id: slug } })
}

/** 专题内已发布笔记（顺序 + 可选关键词），支持分页 */
export async function getSeriesPostsPage(
  seriesId: string,
  page: number,
  pageSize: number,
  query?: string
): Promise<{ posts: PostMeta[]; total: number }> {
  const q = query?.trim()
  const allLinks = await prisma.postSeries.findMany({
    where: {
      seriesId,
      post: {
        status: 'PUBLISHED',
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { summary: { contains: q } },
                { content: { contains: q } },
                { tags: { contains: q } },
              ],
            }
          : {}),
      },
    },
    orderBy: [{ order: 'asc' }, { postId: 'asc' }],
    include: { post: { select: postSelect } },
  })

  // 无 order 的排后，再按发布时间
  allLinks.sort((a, b) => {
    const ao = a.order ?? 999_999
    const bo = b.order ?? 999_999
    if (ao !== bo) return ao - bo
    const ap = a.post.publishedAt?.getTime() ?? 0
    const bp = b.post.publishedAt?.getTime() ?? 0
    return bp - ap
  })

  const total = allLinks.length
  const skip = (page - 1) * pageSize
  const slice = allLinks.slice(skip, skip + pageSize)
  return {
    posts: slice.map((l) => toPostMeta(l.post)),
    total,
  }
}
