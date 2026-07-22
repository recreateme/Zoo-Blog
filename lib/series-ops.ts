import GithubSlugger from 'github-slugger'
import prisma from '@/lib/db'

export interface SeriesMembershipInput {
  name: string
  order: number | null
}

export function slugifySeriesName(name: string): string {
  const slugger = new GithubSlugger()
  const base = slugger.slug(name.trim()) || 'series'
  // github-slugger 对纯中文会保留汉字；Next.js 动态路由可能把 params 以百分号编码传入，
  // 导致 /series/实用工具 查不到。非 ASCII slug 改为稳定的 ascii 形式。
  const ascii = base
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (ascii.length >= 2) return ascii.slice(0, 80)

  let hash = 0
  const src = name.trim()
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0
  }
  return `series-${hash.toString(36)}`.slice(0, 80)
}

export function ensureTags(tags: string[]): string[] {
  const cleaned = tags.map((t) => t.trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : ['未贴标签']
}

/** 解析 frontmatter 中的 series：支持字符串或 {name, order}[] */
export function parseSeriesMemberships(raw: unknown, legacyOrder?: unknown): SeriesMembershipInput[] {
  if (Array.isArray(raw)) {
    const out: SeriesMembershipInput[] = []
    for (const item of raw) {
      if (typeof item === 'string' && item.trim()) {
        out.push({ name: item.trim(), order: null })
        continue
      }
      if (item && typeof item === 'object') {
        const obj = item as { name?: unknown; order?: unknown }
        if (typeof obj.name === 'string' && obj.name.trim()) {
          const order =
            typeof obj.order === 'number' && Number.isFinite(obj.order)
              ? Math.floor(obj.order)
              : null
          out.push({ name: obj.name.trim(), order })
        }
      }
    }
    return dedupeMemberships(out)
  }

  if (typeof raw === 'string' && raw.trim()) {
    const order =
      typeof legacyOrder === 'number' && Number.isFinite(legacyOrder)
        ? Math.floor(legacyOrder)
        : null
    return [{ name: raw.trim(), order }]
  }

  return []
}

function dedupeMemberships(items: SeriesMembershipInput[]): SeriesMembershipInput[] {
  const map = new Map<string, SeriesMembershipInput>()
  for (const item of items) {
    const key = item.name.toLowerCase()
    if (!map.has(key)) map.set(key, item)
  }
  return Array.from(map.values())
}

async function ensureSeriesRecord(name: string) {
  const existing = await prisma.series.findUnique({ where: { name } })
  if (existing) return existing

  let id = slugifySeriesName(name)
  let n = 0
  while (await prisma.series.findUnique({ where: { id } })) {
    n += 1
    id = `${slugifySeriesName(name)}-${n}`
  }
  return prisma.series.create({ data: { id, name } })
}

/** 确保专题存在并同步笔记成员（全量替换该笔记的专题关系） */
export async function syncPostSeriesMemberships(
  postId: string,
  memberships: SeriesMembershipInput[]
): Promise<void> {
  const unique = dedupeMemberships(memberships)
  await prisma.postSeries.deleteMany({ where: { postId } })

  for (const m of unique) {
    const series = await ensureSeriesRecord(m.name)
    await prisma.postSeries.create({
      data: {
        postId,
        seriesId: series.id,
        order: m.order,
      },
    })
  }
}

/**
 * 将非 ASCII 的专题 id 迁到 slugifySeriesName 生成的 ascii id，
 * 避免 Next.js 动态路由 params 百分号编码导致专题页 404。
 */
export async function migrateNonAsciiSeriesIds(): Promise<{
  renamed: number
  skipped: number
}> {
  const rows = await prisma.series.findMany()
  let renamed = 0
  let skipped = 0

  for (const row of rows) {
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(row.id)) {
      skipped += 1
      continue
    }

    let nextId = slugifySeriesName(row.name)
    let n = 0
    while (
      nextId === row.id ||
      (await prisma.series.findUnique({ where: { id: nextId } }))
    ) {
      n += 1
      nextId = `${slugifySeriesName(row.name)}-${n}`
    }

    await prisma.$transaction(async (tx) => {
      await tx.series.create({
        data: {
          id: nextId,
          name: row.name,
          description: row.description,
          coverImage: row.coverImage,
          createdAt: row.createdAt,
        },
      })
      await tx.postSeries.updateMany({
        where: { seriesId: row.id },
        data: { seriesId: nextId },
      })
      await tx.series.delete({ where: { id: row.id } })
    })
    renamed += 1
  }

  return { renamed, skipped }
}
export async function migrateLegacyCategoryAndSeries(): Promise<{
  seriesCreated: number
  linksCreated: number
  tagsFixed: number
}> {
  const { CATEGORIES } = await import('@/lib/categories')
  const catName = new Map(CATEGORIES.map((c) => [c.id, c.name]))

  let seriesCreated = 0
  let linksCreated = 0
  let tagsFixed = 0

  for (const c of CATEGORIES) {
    const existing = await prisma.series.findUnique({ where: { id: c.id } })
    if (!existing) {
      const byName = await prisma.series.findUnique({ where: { name: c.name } })
      if (!byName) {
        await prisma.series.create({
          data: { id: c.id, name: c.name, description: c.description },
        })
        seriesCreated++
      }
    }
  }

  const posts = await prisma.post.findMany({
    select: {
      id: true,
      category: true,
      series: true,
      seriesOrder: true,
      tags: true,
      seriesLinks: { select: { seriesId: true } },
    },
  })

  for (const post of posts) {
    let tags: string[] = []
    try {
      tags = JSON.parse(post.tags || '[]') as string[]
    } catch {
      tags = []
    }
    const ensured = ensureTags(Array.isArray(tags) ? tags : [])
    if (JSON.stringify(ensured) !== JSON.stringify(tags)) {
      await prisma.post.update({
        where: { id: post.id },
        data: { tags: JSON.stringify(ensured) },
      })
      tagsFixed++
    }

    if (post.seriesLinks.length > 0) continue

    const memberships: SeriesMembershipInput[] = []
    if (post.series?.trim()) {
      memberships.push({ name: post.series.trim(), order: post.seriesOrder ?? null })
    }
    const cat = post.category?.trim()
    if (cat && catName.has(cat)) {
      memberships.push({ name: catName.get(cat)!, order: null })
    } else if (cat) {
      memberships.push({ name: cat, order: null })
    }

    if (memberships.length === 0) continue

    const before = await prisma.postSeries.count({ where: { postId: post.id } })
    await syncPostSeriesMemberships(post.id, memberships)
    const after = await prisma.postSeries.count({ where: { postId: post.id } })
    linksCreated += Math.max(0, after - before)
  }

  return { seriesCreated, linksCreated, tagsFixed }
}
