import type { PostMeta } from '@/types'

export function seriesGroupId(name: string): string {
  return `series-${encodeURIComponent(name)}`
}

export type OutlineGroupType = 'series' | 'subcategory' | 'other'

export interface OutlineGroup {
  id: string
  title: string
  type: OutlineGroupType
  posts: PostMeta[]
}

function sortBySeriesOrder(a: PostMeta, b: PostMeta): number {
  const oa = a.seriesOrder ?? 999_999
  const ob = b.seriesOrder ?? 999_999
  if (oa !== ob) return oa - ob
  const da = (a.publishedAt ?? a.createdAt).getTime()
  const db = (b.publishedAt ?? b.createdAt).getTime()
  return da - db
}

function sortByDateDesc(a: PostMeta, b: PostMeta): number {
  return (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime()
}

/** 分类页大纲：专题 → 子分类 → 其他 */
export function groupPostsForCategory(posts: PostMeta[]): OutlineGroup[] {
  const seriesMap = new Map<string, PostMeta[]>()
  const subMap = new Map<string, PostMeta[]>()
  const other: PostMeta[] = []

  for (const post of posts) {
    const series = post.series?.trim()
    if (series) {
      const list = seriesMap.get(series) ?? []
      list.push(post)
      seriesMap.set(series, list)
    } else if (post.subcategory?.trim()) {
      const key = post.subcategory.trim()
      const list = subMap.get(key) ?? []
      list.push(post)
      subMap.set(key, list)
    } else {
      other.push(post)
    }
  }

  const groups: OutlineGroup[] = []

  for (const [title, list] of Array.from(seriesMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b, 'zh-CN')
  )) {
    groups.push({
      id: seriesGroupId(title),
      title,
      type: 'series',
      posts: [...list].sort(sortBySeriesOrder),
    })
  }

  for (const [title, list] of Array.from(subMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b, 'zh-CN')
  )) {
    groups.push({
      id: `sub-${title}`,
      title,
      type: 'subcategory',
      posts: [...list].sort(sortByDateDesc),
    })
  }

  if (other.length > 0) {
    groups.push({
      id: 'other',
      title: '其他笔记',
      type: 'other',
      posts: [...other].sort(sortByDateDesc),
    })
  }

  return groups
}
