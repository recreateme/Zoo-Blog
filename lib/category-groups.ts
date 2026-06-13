import type { PostMeta } from '@/types'

export function seriesGroupId(name: string): string {
  return `series-${encodeURIComponent(name)}`
}

export function chapterGroupId(seriesName: string, chapterName: string): string {
  return `chapter-${encodeURIComponent(seriesName)}--${encodeURIComponent(chapterName)}`
}

export type OutlineGroupType = 'series' | 'subcategory' | 'other'

export interface ChapterOutline {
  id: string
  title: string
  posts: PostMeta[]
}

export interface OutlineGroup {
  id: string
  title: string
  type: OutlineGroupType
  /** 无章节嵌套时使用（子分类、其他） */
  posts: PostMeta[]
  /** 教程（series）下的章节列表 */
  chapters?: ChapterOutline[]
  /** 属于教程但未标 subcategory 的文章 */
  loosePosts?: PostMeta[]
}

export interface OutlineAnchor {
  id: string
  label: string
  indent?: boolean
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

function minSeriesOrder(posts: PostMeta[]): number {
  return Math.min(...posts.map((p) => p.seriesOrder ?? 999_999))
}

function buildSeriesChapters(posts: PostMeta[], seriesName: string): {
  chapters: ChapterOutline[]
  loosePosts: PostMeta[]
} {
  const chapterMap = new Map<string, PostMeta[]>()
  const loosePosts: PostMeta[] = []

  for (const post of posts) {
    const chapter = post.subcategory?.trim()
    if (chapter) {
      const list = chapterMap.get(chapter) ?? []
      list.push(post)
      chapterMap.set(chapter, list)
    } else {
      loosePosts.push(post)
    }
  }

  const chapters = Array.from(chapterMap.entries())
    .sort(([a, pa], [b, pb]) => {
      const oa = minSeriesOrder(pa)
      const ob = minSeriesOrder(pb)
      if (oa !== ob) return oa - ob
      return a.localeCompare(b, 'zh-CN')
    })
    .map(([title, chapterPosts]) => ({
      id: chapterGroupId(seriesName, title),
      title,
      posts: [...chapterPosts].sort(sortBySeriesOrder),
    }))

  return {
    chapters,
    loosePosts: [...loosePosts].sort(sortBySeriesOrder),
  }
}

/** 分类页大纲：教程（含章节嵌套）→ 子分类 → 其他 */
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
    const { chapters, loosePosts } = buildSeriesChapters(list, title)
    const hasChapters = chapters.length > 0

    groups.push({
      id: seriesGroupId(title),
      title,
      type: 'series',
      posts: hasChapters ? [] : [...list].sort(sortBySeriesOrder),
      chapters: hasChapters ? chapters : undefined,
      loosePosts: hasChapters && loosePosts.length > 0 ? loosePosts : undefined,
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

/** 分类页顶部锚点：教程 + 章节 */
export function getOutlineAnchors(groups: OutlineGroup[]): OutlineAnchor[] {
  const anchors: OutlineAnchor[] = []

  for (const group of groups) {
    anchors.push({ id: group.id, label: group.title })
    if (group.type === 'series' && group.chapters?.length) {
      for (const ch of group.chapters) {
        anchors.push({ id: ch.id, label: ch.title, indent: true })
      }
    }
  }

  return anchors
}

export function countPostsInGroup(group: OutlineGroup): number {
  if (group.chapters?.length) {
    const inChapters = group.chapters.reduce((n, ch) => n + ch.posts.length, 0)
    return inChapters + (group.loosePosts?.length ?? 0)
  }
  return group.posts.length
}
