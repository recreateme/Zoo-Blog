import prisma from '@/lib/db'
import { chapterGroupId } from '@/lib/category-groups'

export interface SeriesChapterItem {
  title: string
  postCount: number
  href: string
}

export interface SeriesCatalogItem {
  name: string
  /** 专题 slug */
  id: string
  /** @deprecated 兼容旧字段，等同 id */
  category: string
  categoryName: string
  categoryIcon: string
  postCount: number
  href: string
  chapters: SeriesChapterItem[]
}

function sortChapters(
  entries: [string, { count: number; minOrder: number }][]
): [string, { count: number; minOrder: number }][] {
  return [...entries].sort(([ta, a], [tb, b]) => {
    if (a.minOrder !== b.minOrder) return a.minOrder - b.minOrder
    return ta.localeCompare(tb, 'zh-CN')
  })
}

/** 全站已发布专题汇总（侧栏、首页用），基于 PostSeries */
export async function getSeriesCatalog(limit = 8): Promise<SeriesCatalogItem[]> {
  const seriesRows = await prisma.series.findMany({
    include: {
      posts: {
        where: { post: { status: 'PUBLISHED' } },
        select: {
          order: true,
          post: { select: { subcategory: true } },
        },
      },
    },
  })

  const items: SeriesCatalogItem[] = []

  for (const s of seriesRows) {
    if (s.posts.length === 0) continue
    const chapters = new Map<string, { count: number; minOrder: number }>()
    for (const link of s.posts) {
      const chapter = link.post.subcategory?.trim()
      if (!chapter) continue
      const order = link.order ?? 999_999
      const ch = chapters.get(chapter) ?? { count: 0, minOrder: order }
      ch.count++
      ch.minOrder = Math.min(ch.minOrder, order)
      chapters.set(chapter, ch)
    }

    items.push({
      id: s.id,
      name: s.name,
      category: s.id,
      categoryName: s.name,
      categoryIcon: '📚',
      postCount: s.posts.length,
      href: `/series/${s.id}`,
      chapters: sortChapters(Array.from(chapters.entries())).map(([title, ch]) => ({
        title,
        postCount: ch.count,
        href: `/series/${s.id}#${chapterGroupId(s.name, title)}`,
      })),
    })
  }

  return items
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, limit)
}
