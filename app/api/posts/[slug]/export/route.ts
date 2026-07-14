import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { resolveContentFilePath } from '@/lib/content-source'
import { buildPostExportZip } from '@/lib/post-export-zip'
import { stringifyMarkdownFile } from '@/lib/content-write'
import { parseTags } from '@/lib/utils'
import { parseSeriesMemberships } from '@/lib/series-ops'
import fs from 'fs/promises'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const post = await prisma.post.findUnique({
    where: { id: params.slug },
    include: {
      seriesLinks: {
        select: { order: true, series: { select: { name: true } } },
      },
    },
  })
  if (!post) return NextResponse.json({ error: '文章不存在' }, { status: 404 })

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

  const zip = await buildPostExportZip({
    slug: post.id,
    title: post.title,
    markdownBody: post.content,
    frontmatterRaw,
    filePath: post.filePath,
    coverImage: post.coverImage,
  })

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${post.id}.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
