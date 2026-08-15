import fs from 'fs/promises'
import prisma from '@/lib/db'
import { resolveContentFilePath } from '@/lib/content-source'
import { stringifyMarkdownFile } from '@/lib/content-write'
import { parseTags } from '@/lib/utils'
import { parseSeriesMemberships } from '@/lib/series-ops'
import type { ExportZipInput } from '@/lib/post-export-zip'

/** 从数据库组装单篇导出输入（优先读磁盘 Markdown） */
export async function loadPostExportInput(id: string): Promise<ExportZipInput | null> {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      seriesLinks: {
        select: { order: true, series: { select: { name: true } } },
      },
    },
  })
  if (!post) return null

  let frontmatterRaw: string | null = null
  if (post.filePath) {
    try {
      frontmatterRaw = await fs.readFile(resolveContentFilePath(post.filePath), 'utf-8')
    } catch {
      frontmatterRaw = null
    }
  }

  const memberships =
    post.seriesLinks.length > 0
      ? post.seriesLinks.map((l) => ({
          name: l.series.name,
          order: l.order,
        }))
      : parseSeriesMemberships(post.series, post.seriesOrder)

  if (!frontmatterRaw) {
    frontmatterRaw = stringifyMarkdownFile(
      {
        title: post.title,
        slug: post.id,
        tags: parseTags(post.tags),
        status: post.status === 'PUBLISHED' ? 'published' : 'draft',
        summary: post.summary,
        subcategory: post.subcategory,
        series: memberships,
        cover: post.coverImage,
        publishedAt: post.publishedAt,
      },
      post.content
    )
  }

  return {
    slug: post.id,
    title: post.title,
    markdownBody: post.content,
    frontmatterRaw,
    filePath: post.filePath,
    coverImage: post.coverImage,
  }
}
