import prisma from '@/lib/db'
import { extractWikiLinks } from '@/lib/utils'

/** 构建 [[标题]] / [[slug]] → postId 映射 */
export async function buildWikiSlugMap(): Promise<Record<string, string>> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true },
  })
  const map: Record<string, string> = {}
  for (const p of posts) {
    map[p.id] = p.id
    if (p.title.trim()) map[p.title.trim()] = p.id
  }
  return map
}

/** 将 Markdown 中的 [[链接]] 转为标准 Markdown 链接 */
export function preprocessWikiLinksInMarkdown(
  markdown: string,
  slugMap: Record<string, string>
): string {
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (_, raw: string) => {
    const title = raw.trim()
    const slug = slugMap[title]
    if (slug) return `[${title}](/post/${slug})`
    return `[[${title}]]`
  })
}

/** 同步 PostLink 表（出链） */
export async function syncPostLinksForContent(
  postId: string,
  content: string,
  slugMap: Record<string, string>
): Promise<void> {
  const titles = extractWikiLinks(content)
  const targetIds = new Set<string>()

  for (const title of titles) {
    const slug = slugMap[title.trim()]
    if (slug && slug !== postId) targetIds.add(slug)
  }

  await prisma.$transaction([
    prisma.postLink.deleteMany({ where: { fromPostId: postId } }),
    ...Array.from(targetIds).map((toPostId) =>
      prisma.postLink.create({ data: { fromPostId: postId, toPostId } })
    ),
  ])
}

/** 批量同步多篇文章的出链 */
export async function syncPostLinksBatch(postIds: string[]): Promise<void> {
  if (postIds.length === 0) return
  const [slugMap, posts] = await Promise.all([
    buildWikiSlugMap(),
    prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, content: true },
    }),
  ])
  for (const post of posts) {
    await syncPostLinksForContent(post.id, post.content, slugMap)
  }
}

/** 删除文章时清理相关 PostLink */
export async function removePostLinksForIds(removedIds: string[]): Promise<void> {
  if (removedIds.length === 0) return
  await prisma.postLink.deleteMany({
    where: {
      OR: [
        { fromPostId: { in: removedIds } },
        { toPostId: { in: removedIds } },
      ],
    },
  })
}
