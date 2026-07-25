import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { parseTags, stringifyTags, computePostStats } from '@/lib/utils'
import { indexPostById, removePostFromIndex } from '@/lib/search-index'
import {
  indexPostById as indexPostVectors,
  removePostVectors,
} from '@/lib/vector-index'
import { deleteBoundMarkdownFile } from '@/lib/content-source'
import { writeMarkdownToContent } from '@/lib/content-write'
import {
  syncPostSeriesMemberships,
  type SeriesMembershipInput,
} from '@/lib/series-ops'
import { revalidatePublishedContent } from '@/lib/revalidate-content'
import { syncPostLinksForContent, buildWikiSlugMap, removePostLinksForIds } from '@/lib/wiki-links'
import { decodeRouteParam } from '@/lib/route-params'
import { z } from 'zod'

const SeriesMemberSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().nullable().optional(),
})

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().nullable().optional(),
  series: z.string().nullable().optional(),
  seriesOrder: z.number().int().nullable().optional(),
  seriesMemberships: z.array(SeriesMemberSchema).optional(),
  coverImage: z.string().nullable().optional(),
  tags: z.array(z.string()).min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  summary: z.string().nullable().optional(),
  outline: z.array(z.string()).optional(),
  writeFile: z.boolean().optional(),
})

// GET /api/posts/[slug]
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const id = decodeRouteParam(params.slug)
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      seriesLinks: {
        orderBy: { order: 'asc' },
        select: { order: true, series: { select: { id: true, name: true } } },
      },
    },
  })
  if (!post) return NextResponse.json({ error: '文章不存在' }, { status: 404 })

  const seriesMemberships = post.seriesLinks.map((l) => ({
    id: l.series.id,
    name: l.series.name,
    order: l.order,
  }))

  return NextResponse.json({
    post: { ...post, tags: parseTags(post.tags), seriesMemberships },
  })
}

// PUT /api/posts/[slug]
export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()
    const data = UpdatePostSchema.parse(body)
    const id = decodeRouteParam(params.slug)

    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '文章不存在' }, { status: 404 })

    const contentForStats = data.content ?? existing.content
    const stats = computePostStats(contentForStats)
    const readingTime = data.content !== undefined ? stats.readingTime : existing.readingTime
    const wordCount = data.content !== undefined ? stats.wordCount : existing.wordCount

    let memberships: SeriesMembershipInput[] | undefined
    if (data.seriesMemberships !== undefined) {
      memberships = data.seriesMemberships.map((m) => ({
        name: m.name.trim(),
        order: m.order ?? null,
      }))
    } else if (data.series !== undefined) {
      const name = data.series?.trim() || null
      memberships = name
        ? [
            {
              name,
              order:
                data.seriesOrder !== undefined ? data.seriesOrder : existing.seriesOrder,
            },
          ]
        : []
    }

    const primary = memberships?.[0]
    const nextSeries =
      memberships !== undefined ? (primary?.name ?? null) : existing.series
    const nextSeriesOrder =
      memberships !== undefined
        ? (primary?.order ?? null)
        : data.seriesOrder !== undefined
          ? data.seriesOrder
          : existing.seriesOrder

    // 发布时间处理
    let publishedAt = existing.publishedAt
    if (data.status === 'PUBLISHED' && existing.status === 'DRAFT') {
      publishedAt = new Date()
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.category && { category: data.category }),
        ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
        ...((memberships !== undefined ||
          data.series !== undefined ||
          data.seriesOrder !== undefined) && {
          series: nextSeries,
          seriesOrder: nextSeriesOrder,
        }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
        ...(data.tags !== undefined && { tags: stringifyTags(data.tags) }),
        ...(data.status && { status: data.status }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.outline !== undefined && { outline: JSON.stringify(data.outline) }),
        readingTime,
        wordCount,
        publishedAt,
      },
    })

    if (memberships !== undefined) {
      await syncPostSeriesMemberships(updated.id, memberships)
    }

    const shouldWrite =
      data.writeFile === true || (!!existing.filePath && data.writeFile !== false)
    if (shouldWrite && (existing.filePath || data.writeFile)) {
      const filePath = existing.filePath ?? `${updated.id}.md`
      const tags = data.tags ?? parseTags(updated.tags)
      const seriesForFile =
        memberships ??
        (updated.series
          ? [{ name: updated.series, order: updated.seriesOrder }]
          : [])
      await writeMarkdownToContent(
        filePath,
        {
          title: updated.title,
          slug: updated.id,
          tags,
          status: updated.status === 'PUBLISHED' ? 'published' : 'draft',
          summary: updated.summary,
          subcategory: updated.subcategory,
          series: seriesForFile,
          cover: updated.coverImage,
          publishedAt: updated.publishedAt,
        },
        updated.content
      )
      if (!existing.filePath) {
        await prisma.post.update({
          where: { id: updated.id },
          data: { filePath },
        })
        ;(updated as { filePath: string | null }).filePath = filePath
      }
    }

    try {
      await indexPostById(updated.id)
    } catch (err) {
      console.warn(`搜索索引更新失败 (${updated.id}):`, err)
    }

    try {
      await indexPostVectors(updated.id)
    } catch (err) {
      console.warn(`向量索引更新失败 (${updated.id}):`, err)
    }

    if (updated.status === 'PUBLISHED' || existing.status === 'PUBLISHED') {
      revalidatePublishedContent({ postIds: [updated.id] })
      if (updated.status === 'PUBLISHED') {
        try {
          const slugMap = await buildWikiSlugMap()
          await syncPostLinksForContent(updated.id, updated.content, slugMap)
        } catch (err) {
          console.warn(`双向链接同步失败 (${updated.id}):`, err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      post: { ...updated, tags: parseTags(updated.tags) },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数验证失败' }, { status: 400 })
    }
    console.error('Update post error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

// DELETE /api/posts/[slug]?deleteFile=1 同时删除 content/ 下绑定的 MD
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const deleteFile = req.nextUrl.searchParams.get('deleteFile') === '1'
  const id = decodeRouteParam(params.slug)

  try {
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: '文章不存在' }, { status: 404 })

    let fileDeleted = false
    if (deleteFile && existing.filePath) {
      fileDeleted = await deleteBoundMarkdownFile(existing.filePath)
    }

    await prisma.post.delete({ where: { id } })
    try {
      await removePostFromIndex(id)
    } catch (err) {
      console.warn(`搜索索引删除失败 (${id}):`, err)
    }

    try {
      await removePostVectors(id)
    } catch (err) {
      console.warn(`向量索引删除失败 (${id}):`, err)
    }

    if (existing.status === 'PUBLISHED') {
      revalidatePublishedContent({ removedIds: [id] })
    }
    await removePostLinksForIds([id])

    return NextResponse.json({
      success: true,
      fileDeleted,
      hadFilePath: !!existing.filePath,
    })
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
