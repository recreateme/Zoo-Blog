import prisma from '@/lib/db'

export interface AdjacentPost {
  id: string
  title: string
}

export interface PostAdjacency {
  prev: AdjacentPost | null
  next: AdjacentPost | null
}

function sortByPublishedAsc<T extends {
  id: string
  title: string
  publishedAt: Date | null
  createdAt: Date
}>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const da = (a.publishedAt ?? a.createdAt).getTime()
    const db = (b.publishedAt ?? b.createdAt).getTime()
    return da - db
  })
}

function adjacencyFromList(
  postId: string,
  posts: { id: string; title: string }[]
): PostAdjacency {
  const index = posts.findIndex((p) => p.id === postId)
  if (index === -1) return { prev: null, next: null }
  return {
    prev: index > 0 ? { id: posts[index - 1].id, title: posts[index - 1].title } : null,
    next: index < posts.length - 1 ? { id: posts[index + 1].id, title: posts[index + 1].title } : null,
  }
}

/**
 * 有专题时在同专题内按 order → 发布时间导航；
 * 无专题时按全站发布时间导航。
 * @deprecated 第三参 category 已忽略，保留签名兼容旧调用
 */
export async function getPostAdjacency(
  postId: string,
  _category: string,
  series: string | null
): Promise<PostAdjacency> {
  const seriesName = series?.trim() || null

  if (seriesName) {
    const membership = await prisma.postSeries.findFirst({
      where: {
        postId,
        series: { name: seriesName },
      },
      select: { seriesId: true },
    })
    if (membership) {
      return getPostAdjacencyBySeriesId(postId, membership.seriesId)
    }
  }

  const raw = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      publishedAt: true,
      createdAt: true,
    },
  })
  return adjacencyFromList(postId, sortByPublishedAsc(raw))
}

/** 按专题成员顺序导航 */
export async function getPostAdjacencyBySeriesId(
  postId: string,
  seriesId: string | null
): Promise<PostAdjacency> {
  if (!seriesId) {
    return getPostAdjacency(postId, '', null)
  }

  const links = await prisma.postSeries.findMany({
    where: {
      seriesId,
      post: { status: 'PUBLISHED' },
    },
    select: {
      order: true,
      post: {
        select: {
          id: true,
          title: true,
          publishedAt: true,
          createdAt: true,
        },
      },
    },
  })

  const posts = [...links]
    .sort((a, b) => {
      const oa = a.order ?? 999_999
      const ob = b.order ?? 999_999
      if (oa !== ob) return oa - ob
      const da = (a.post.publishedAt ?? a.post.createdAt).getTime()
      const db = (b.post.publishedAt ?? b.post.createdAt).getTime()
      return da - db
    })
    .map((l) => ({ id: l.post.id, title: l.post.title }))

  return adjacencyFromList(postId, posts)
}

export interface SeriesPostItem {
  id: string
  title: string
  seriesOrder: number | null
  subcategory: string | null
}

/** @deprecated 请用 getSeriesPostsById；保留兼容字符串专题名 */
export async function getSeriesPosts(
  _category: string,
  series: string
): Promise<SeriesPostItem[]> {
  const row = await prisma.series.findFirst({
    where: { name: series },
    select: { id: true },
  })
  if (!row) return []
  return getSeriesPostsById(row.id)
}

/** 同专题文章列表（文章页教程目录） */
export async function getSeriesPostsById(seriesId: string): Promise<SeriesPostItem[]> {
  const links = await prisma.postSeries.findMany({
    where: {
      seriesId,
      post: { status: 'PUBLISHED' },
    },
    select: {
      order: true,
      post: {
        select: {
          id: true,
          title: true,
          subcategory: true,
          publishedAt: true,
          createdAt: true,
        },
      },
    },
  })

  return [...links]
    .sort((a, b) => {
      const oa = a.order ?? 999_999
      const ob = b.order ?? 999_999
      if (oa !== ob) return oa - ob
      const da = (a.post.publishedAt ?? a.post.createdAt).getTime()
      const db = (b.post.publishedAt ?? b.post.createdAt).getTime()
      return da - db
    })
    .map((l) => ({
      id: l.post.id,
      title: l.post.title,
      seriesOrder: l.order,
      subcategory: l.post.subcategory,
    }))
}
