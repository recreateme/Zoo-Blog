import prisma from '@/lib/db'
export interface AdjacentPost {
  id: string
  title: string
}

export interface PostAdjacency {
  prev: AdjacentPost | null
  next: AdjacentPost | null
}

function sortForNavigation(
  posts: { id: string; title: string; seriesOrder: number | null; publishedAt: Date | null; createdAt: Date }[],
  useSeriesOrder: boolean
) {
  return [...posts].sort((a, b) => {
    if (useSeriesOrder) {
      const oa = a.seriesOrder ?? 999_999
      const ob = b.seriesOrder ?? 999_999
      if (oa !== ob) return oa - ob
    }
    const da = (a.publishedAt ?? a.createdAt).getTime()
    const db = (b.publishedAt ?? b.createdAt).getTime()
    return da - db
  })
}

/** 同分类；有专题时仅在专题内按 seriesOrder 排序导航 */
export async function getPostAdjacency(
  postId: string,
  category: string,
  series: string | null
): Promise<PostAdjacency> {
  const seriesName = series?.trim() || null

  const where = seriesName
    ? { status: 'PUBLISHED' as const, category, series: seriesName }
    : {
        status: 'PUBLISHED' as const,
        category,
        OR: [{ series: null }, { series: '' }],
      }

  const raw = await prisma.post.findMany({
    where,
    select: {
      id: true,
      title: true,
      seriesOrder: true,
      publishedAt: true,
      createdAt: true,
    },
  })

  const posts = sortForNavigation(raw, !!seriesName)
  const index = posts.findIndex((p) => p.id === postId)
  if (index === -1) return { prev: null, next: null }

  return {
    prev: index > 0 ? { id: posts[index - 1].id, title: posts[index - 1].title } : null,
    next: index < posts.length - 1 ? { id: posts[index + 1].id, title: posts[index + 1].title } : null,
  }
}

export interface SeriesPostItem {
  id: string
  title: string
  seriesOrder: number | null
}

/** 同专题文章列表（文章页专题目录） */
export async function getSeriesPosts(
  category: string,
  series: string
): Promise<SeriesPostItem[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', category, series },
    select: { id: true, title: true, seriesOrder: true, publishedAt: true, createdAt: true },
  })

  return sortForNavigation(posts, true).map((p) => ({
    id: p.id,
    title: p.title,
    seriesOrder: p.seriesOrder ?? null,
  }))
}
