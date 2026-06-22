import prisma from '@/lib/db'
import { parseTags } from '@/lib/utils'

export type GraphView = 'links' | 'tags' | 'timeline'

export interface GraphNode {
  id: string
  label: string
  category?: string
  series?: string | null
  /** 标签节点：出现于哪些分类 */
  categories?: string[]
  /** 标签节点：出现于哪些专题 */
  seriesList?: string[]
  kind: 'post' | 'tag'
  degree: number
  publishedAt?: string | null
}

export interface GraphLink {
  source: string
  target: string
  since?: string | null
}

export interface GraphTimelineStep {
  id: string
  label: string
  nodeIds: string[]
  linkKeys: string[]
}

export interface GraphTimelineMeta {
  steps: GraphTimelineStep[]
}

export interface GraphPayload {
  view: GraphView
  nodes: GraphNode[]
  links: GraphLink[]
  stats: {
    nodeCount: number
    linkCount: number
  }
  timeline?: GraphTimelineMeta
}

export interface GraphFilters {
  category?: string
  series?: string
  hideIsolated?: boolean
}

export const EMPTY_GRAPH_FILTERS: GraphFilters = {}

interface PostRow {
  id: string
  title: string
  category: string
  series?: string | null
  tags: string
}

interface DatedPostRow extends PostRow {
  publishedAt: Date | null
  createdAt: Date
}

export function linkKey(source: string, target: string): string {
  return `${source}|${target}`
}

/** 从同篇笔记的标签列表生成共现边（无向，source < target 去重） */
export function buildTagCooccurrenceLinks(tagLists: string[][]): GraphLink[] {
  const edgeSet = new Set<string>()
  const links: GraphLink[] = []

  for (const tags of tagLists) {
    const unique = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)))
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = unique[i]
        const b = unique[j]
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        if (edgeSet.has(key)) continue
        edgeSet.add(key)
        links.push({ source: a, target: b })
      }
    }
  }

  return links
}

export function buildTagGraphFromPosts(posts: PostRow[]): GraphPayload {
  const tagDegree = new Map<string, number>()
  const tagLists: string[][] = []
  const tagMeta = new Map<string, { categories: Set<string>; series: Set<string> }>()

  for (const post of posts) {
    const tags = parseTags(post.tags)
    tagLists.push(tags)
    for (const tag of tags) {
      tagDegree.set(tag, (tagDegree.get(tag) ?? 0) + 1)
      const meta = tagMeta.get(tag) ?? { categories: new Set<string>(), series: new Set<string>() }
      meta.categories.add(post.category)
      const s = post.series?.trim()
      if (s) meta.series.add(s)
      tagMeta.set(tag, meta)
    }
  }

  const links = buildTagCooccurrenceLinks(tagLists)
  const linkedTags = new Set(links.flatMap((l) => [l.source, l.target]))

  for (const [tag] of Array.from(tagDegree.entries())) {
    linkedTags.add(tag)
  }

  const nodes: GraphNode[] = Array.from(linkedTags)
    .sort((a, b) => (tagDegree.get(b) ?? 0) - (tagDegree.get(a) ?? 0))
    .map((tag) => {
      const meta = tagMeta.get(tag)
      return {
        id: tag,
        label: `#${tag}`,
        kind: 'tag' as const,
        degree: tagDegree.get(tag) ?? 0,
        categories: meta ? Array.from(meta.categories) : [],
        seriesList: meta ? Array.from(meta.series) : [],
      }
    })

  return {
    view: 'tags',
    nodes,
    links,
    stats: { nodeCount: nodes.length, linkCount: links.length },
  }
}

export function buildLinkGraphFromData(
  posts: PostRow[],
  links: { fromPostId: string; toPostId: string }[]
): GraphPayload {
  const postIds = new Set(posts.map((p) => p.id))
  const degreeMap = new Map<string, number>()

  const validLinks = links.filter(
    (l) => postIds.has(l.fromPostId) && postIds.has(l.toPostId)
  )

  for (const l of validLinks) {
    degreeMap.set(l.fromPostId, (degreeMap.get(l.fromPostId) ?? 0) + 1)
    degreeMap.set(l.toPostId, (degreeMap.get(l.toPostId) ?? 0) + 1)
  }

  const nodes: GraphNode[] = posts.map((p) => ({
    id: p.id,
    label: p.title,
    category: p.category,
    series: p.series?.trim() || null,
    kind: 'post',
    degree: degreeMap.get(p.id) ?? 0,
  }))

  return {
    view: 'links',
    nodes,
    links: validLinks.map((l) => ({ source: l.fromPostId, target: l.toPostId })),
    stats: { nodeCount: nodes.length, linkCount: validLinks.length },
  }
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${y}年${parseInt(m, 10)}月`
}

export function endOfMonthFromKey(key: string): Date {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0, 23, 59, 59, 999)
}

/** 按月累积：截至该月末已发布的笔记与链接 */
export function buildTimelineSteps(
  posts: DatedPostRow[],
  rawLinks: { fromPostId: string; toPostId: string }[]
): GraphTimelineMeta {
  if (posts.length === 0) return { steps: [] }

  const dated = posts
    .map((p) => ({ ...p, at: p.publishedAt ?? p.createdAt }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())

  const postDateMap = new Map(dated.map((p) => [p.id, p.at]))
  const months = Array.from(new Set(dated.map((p) => monthKey(p.at)))).sort()

  const steps: GraphTimelineStep[] = months.map((month) => {
    const cutoff = endOfMonthFromKey(month)
    const nodeIds = dated.filter((p) => p.at <= cutoff).map((p) => p.id)
    const nodeSet = new Set(nodeIds)

    const activeLinks = rawLinks.filter((l) => {
      if (!nodeSet.has(l.fromPostId) || !nodeSet.has(l.toPostId)) return false
      const fromDate = postDateMap.get(l.fromPostId)
      return fromDate != null && fromDate <= cutoff
    })

    return {
      id: month,
      label: monthLabel(month),
      nodeIds,
      linkKeys: activeLinks.map((l) => linkKey(l.fromPostId, l.toPostId)),
    }
  })

  return { steps }
}

export function buildTimelineGraphFromData(
  posts: DatedPostRow[],
  rawLinks: { fromPostId: string; toPostId: string }[]
): GraphPayload {
  const base = buildLinkGraphFromData(posts, rawLinks)
  const postDateMap = new Map(
    posts.map((p) => [p.id, (p.publishedAt ?? p.createdAt).toISOString()])
  )

  const nodes = base.nodes.map((n) => ({
    ...n,
    publishedAt: postDateMap.get(n.id) ?? null,
  }))

  const links = base.links.map((l) => ({
    ...l,
    since: postDateMap.get(l.source) ?? null,
  }))

  const timeline = buildTimelineSteps(posts, rawLinks)

  return {
    view: 'timeline',
    nodes,
    links,
    stats: base.stats,
    timeline,
  }
}

export function filterGraphByTimelineStep(
  payload: GraphPayload,
  stepIndex: number
): { nodes: GraphNode[]; links: GraphLink[]; step: GraphTimelineStep | null } {
  const step = payload.timeline?.steps[stepIndex] ?? null
  if (!step) {
    return { nodes: payload.nodes, links: payload.links, step: null }
  }

  const nodeSet = new Set(step.nodeIds)
  const linkSet = new Set(step.linkKeys)

  const nodes = payload.nodes.filter((n) => nodeSet.has(n.id))
  const links = payload.links.filter((l) => linkSet.has(linkKey(l.source, l.target)))

  return { nodes, links, step }
}

function nodeMatchesCategory(node: GraphNode, category: string): boolean {
  if (node.kind === 'post') return node.category === category
  return node.categories?.includes(category) ?? false
}

function nodeMatchesSeries(node: GraphNode, series: string): boolean {
  if (node.kind === 'post') return node.series === series
  return node.seriesList?.includes(series) ?? false
}

function pruneIsolatedNodes(nodes: GraphNode[], links: GraphLink[]): GraphNode[] {
  if (links.length === 0) return []
  const linked = new Set<string>()
  for (const l of links) {
    linked.add(l.source)
    linked.add(l.target)
  }
  return nodes.filter((n) => linked.has(n.id))
}

/** 分类 / 专题 / 孤立节点筛选（在时间轴切片之后调用） */
export function applyGraphFilters(
  payload: Pick<GraphPayload, 'nodes' | 'links'>,
  filters: GraphFilters
): { nodes: GraphNode[]; links: GraphLink[] } {
  const category = filters.category?.trim()
  const series = filters.series?.trim()
  const hasCategory = Boolean(category)
  const hasSeries = Boolean(series)

  let nodes = payload.nodes
  if (hasCategory) {
    nodes = nodes.filter((n) => nodeMatchesCategory(n, category!))
  }
  if (hasSeries) {
    nodes = nodes.filter((n) => nodeMatchesSeries(n, series!))
  }

  const nodeIds = new Set(nodes.map((n) => n.id))
  let links = payload.links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))

  if (filters.hideIsolated) {
    nodes = pruneIsolatedNodes(nodes, links)
    const remaining = new Set(nodes.map((n) => n.id))
    links = links.filter((l) => remaining.has(l.source) && remaining.has(l.target))
  }

  return { nodes, links }
}

export function collectSeriesOptions(nodes: GraphNode[]): string[] {
  const set = new Set<string>()
  for (const n of nodes) {
    if (n.series?.trim()) set.add(n.series.trim())
    for (const s of n.seriesList ?? []) {
      if (s.trim()) set.add(s.trim())
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export async function getLinkGraphData(): Promise<GraphPayload> {
  const [posts, links] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, category: true, series: true, tags: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.postLink.findMany({
      select: { fromPostId: true, toPostId: true },
    }),
  ])

  return buildLinkGraphFromData(posts, links)
}

export async function getTagGraphData(): Promise<GraphPayload> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true, category: true, series: true, tags: true },
  })

  return buildTagGraphFromPosts(posts)
}

export async function getTimelineGraphData(): Promise<GraphPayload> {
  const [posts, links] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        category: true,
        series: true,
        tags: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: [{ publishedAt: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.postLink.findMany({
      select: { fromPostId: true, toPostId: true },
    }),
  ])

  return buildTimelineGraphFromData(posts, links)
}

export async function getGraphData(view: GraphView): Promise<GraphPayload> {
  if (view === 'tags') return getTagGraphData()
  if (view === 'timeline') return getTimelineGraphData()
  return getLinkGraphData()
}
