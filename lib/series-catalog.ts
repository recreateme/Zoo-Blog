import prisma from '@/lib/db'
import { getCategoryById } from '@/lib/categories'
import { seriesGroupId, chapterGroupId } from '@/lib/category-groups'

export interface SeriesChapterItem {
  title: string
  postCount: number
  href: string
}

export interface SeriesCatalogItem {
  name: string
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

/** 全站已发布教程汇总（侧栏、首页用），含章节嵌套 */
export async function getSeriesCatalog(limit = 8): Promise<SeriesCatalogItem[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', series: { not: null } },
    select: {
      series: true,
      subcategory: true,
      category: true,
      seriesOrder: true,
    },
    orderBy: [{ category: 'asc' }, { series: 'asc' }, { seriesOrder: 'asc' }],
  })

  type ChapterAcc = { count: number; minOrder: number }
  type SeriesAcc = {
    category: string
    count: number
    chapters: Map<string, ChapterAcc>
  }

  const map = new Map<string, SeriesAcc>()

  for (const p of posts) {
    const name = p.series?.trim()
    if (!name) continue
    const key = `${p.category}::${name}`
    let acc = map.get(key)
    if (!acc) {
      acc = { category: p.category, count: 0, chapters: new Map() }
      map.set(key, acc)
    }
    acc.count++
    const order = p.seriesOrder ?? 999_999
    const chapter = p.subcategory?.trim()
    if (chapter) {
      const ch = acc.chapters.get(chapter) ?? { count: 0, minOrder: order }
      ch.count++
      ch.minOrder = Math.min(ch.minOrder, order)
      acc.chapters.set(chapter, ch)
    }
  }

  const items: SeriesCatalogItem[] = []
  for (const [key, data] of Array.from(map.entries())) {
    const name = key.split('::').slice(1).join('::')
    const cat = getCategoryById(data.category)
    const chapters = sortChapters(Array.from(data.chapters.entries())).map(([title, ch]) => ({
      title,
      postCount: ch.count,
      href: `/${data.category}#${chapterGroupId(name, title)}`,
    }))

    items.push({
      name,
      category: data.category,
      categoryName: cat?.name ?? data.category,
      categoryIcon: cat?.icon ?? '📁',
      postCount: data.count,
      href: `/${data.category}#${seriesGroupId(name)}`,
      chapters,
    })
  }

  return items
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, limit)
}
