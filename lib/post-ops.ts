import prisma from '@/lib/db'
import { isAsciiSlug, slugifyPostId } from '@/lib/post-slug'

/**
 * 将非 ASCII 的笔记 id 迁到 ASCII slug，避免公开页 /post/[slug] 因百分号编码 404。
 */
export async function migrateNonAsciiPostIds(): Promise<{
  renamed: number
  skipped: number
  mapping: { from: string; to: string }[]
}> {
  const rows = await prisma.post.findMany({
    include: { seriesLinks: true },
  })

  let renamed = 0
  let skipped = 0
  const mapping: { from: string; to: string }[] = []

  for (const row of rows) {
    if (isAsciiSlug(row.id)) {
      skipped += 1
      continue
    }

    let nextId = slugifyPostId(row.title || row.id)
    let n = 0
    while (
      nextId === row.id ||
      (await prisma.post.findUnique({ where: { id: nextId } }))
    ) {
      n += 1
      nextId = `${slugifyPostId(row.title || row.id)}-${n}`
    }

    await prisma.$transaction(async (tx) => {
      await tx.post.create({
        data: {
          id: nextId,
          title: row.title,
          content: row.content,
          summary: row.summary,
          outline: row.outline,
          category: row.category,
          subcategory: row.subcategory,
          series: row.series,
          seriesOrder: row.seriesOrder,
          coverImage: row.coverImage,
          wordCount: row.wordCount,
          tags: row.tags,
          status: row.status,
          readingTime: row.readingTime,
          filePath: row.filePath,
          viewCount: row.viewCount,
          createdAt: row.createdAt,
          publishedAt: row.publishedAt,
        },
      })

      if (row.seriesLinks.length > 0) {
        await tx.postSeries.createMany({
          data: row.seriesLinks.map((l) => ({
            postId: nextId,
            seriesId: l.seriesId,
            order: l.order,
          })),
        })
      }

      await tx.attachment.updateMany({
        where: { postId: row.id },
        data: { postId: nextId },
      })
      await tx.pageView.updateMany({
        where: { postId: row.id },
        data: { postId: nextId },
      })
      await tx.postLink.deleteMany({
        where: { OR: [{ fromPostId: row.id }, { toPostId: row.id }] },
      })
      await tx.post.delete({ where: { id: row.id } })
    })

    mapping.push({ from: row.id, to: nextId })
    renamed += 1
  }

  return { renamed, skipped, mapping }
}
