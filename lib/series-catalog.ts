import prisma from '@/lib/db'
import { getCategoryById } from '@/lib/categories'
import { seriesGroupId } from '@/lib/category-groups'

export interface SeriesCatalogItem {
  name: string
  category: string
  categoryName: string
  categoryIcon: string
  postCount: number
  href: string
}

/** 全站已发布专题汇总（侧栏、首页用） */
export async function getSeriesCatalog(limit = 12): Promise<SeriesCatalogItem[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', series: { not: null } },
    select: { series: true, category: true, id: true, seriesOrder: true },
    orderBy: [{ category: 'asc' }, { series: 'asc' }, { seriesOrder: 'asc' }],
  })

  const map = new Map<string, { category: string; count: number; firstId: string }>()

  for (const p of posts) {
    const name = p.series?.trim()
    if (!name) continue
    const key = `${p.category}::${name}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { category: p.category, count: 1, firstId: p.id })
    } else {
      existing.count++
    }
  }

  const items: SeriesCatalogItem[] = []
  for (const [key, data] of Array.from(map.entries())) {
    const name = key.split('::').slice(1).join('::')
    const cat = getCategoryById(data.category)
    items.push({
      name,
      category: data.category,
      categoryName: cat?.name ?? data.category,
      categoryIcon: cat?.icon ?? '📁',
      postCount: data.count,
      href: `/${data.category}#${seriesGroupId(name)}`,
    })
  }

  return items
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, limit)
}
