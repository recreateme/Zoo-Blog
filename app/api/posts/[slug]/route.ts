import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { parseTags, stringifyTags, computePostStats } from '@/lib/utils'
import { z } from 'zod'

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().nullable().optional(),
  series: z.string().nullable().optional(),
  seriesOrder: z.number().int().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  summary: z.string().nullable().optional(),
})

// GET /api/posts/[slug]
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const post = await prisma.post.findUnique({ where: { id: params.slug } })
  if (!post) return NextResponse.json({ error: '文章不存在' }, { status: 404 })

  return NextResponse.json({ post: { ...post, tags: parseTags(post.tags) } })
}

// PUT /api/posts/[slug]
export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()
    const data = UpdatePostSchema.parse(body)

    const existing = await prisma.post.findUnique({ where: { id: params.slug } })
    if (!existing) return NextResponse.json({ error: '文章不存在' }, { status: 404 })

    const contentForStats = data.content ?? existing.content
    const stats = computePostStats(contentForStats)
    const readingTime = data.content !== undefined ? stats.readingTime : existing.readingTime
    const wordCount = data.content !== undefined ? stats.wordCount : existing.wordCount

    const nextSeries =
      data.series !== undefined ? (data.series?.trim() || null) : existing.series
    const nextSeriesOrder = !nextSeries
      ? null
      : data.seriesOrder !== undefined
        ? data.seriesOrder
        : existing.seriesOrder

    // 发布时间处理
    let publishedAt = existing.publishedAt
    if (data.status === 'PUBLISHED' && existing.status === 'DRAFT') {
      publishedAt = new Date()
    }

    const updated = await prisma.post.update({
      where: { id: params.slug },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.category && { category: data.category }),
        ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
        ...((data.series !== undefined || data.seriesOrder !== undefined) && {
          series: nextSeries,
          seriesOrder: nextSeriesOrder,
        }),
        ...(data.tags !== undefined && { tags: stringifyTags(data.tags) }),
        ...(data.status && { status: data.status }),
        ...(data.summary !== undefined && { summary: data.summary }),
        readingTime,
        wordCount,
        publishedAt,
      },
    })

    return NextResponse.json({ success: true, post: { ...updated, tags: parseTags(updated.tags) } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数验证失败' }, { status: 400 })
    }
    console.error('Update post error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

// DELETE /api/posts/[slug]
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    await prisma.post.delete({ where: { id: params.slug } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
