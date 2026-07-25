import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { parseTags, stringifyTags, computePostStats } from '@/lib/utils'
import { indexPostById } from '@/lib/search-index'
import { indexPostById as indexPostVectors } from '@/lib/vector-index'
import { revalidatePublishedContent } from '@/lib/revalidate-content'
import { syncPostLinksForContent, buildWikiSlugMap, removePostLinksForIds } from '@/lib/wiki-links'
import { syncPostSeriesMemberships } from '@/lib/series-ops'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const CreatePostSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  content: z.string(),
  category: z.string().optional().default('others'),
  subcategory: z.string().optional(),
  series: z.string().optional(),
  seriesOrder: z.number().int().optional(),
  seriesMemberships: z
    .array(
      z.object({
        name: z.string().min(1),
        order: z.number().int().nullable().optional(),
      })
    )
    .optional(),
  coverImage: z.string().nullable().optional(),
  tags: z.array(z.string()).min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  summary: z.string().optional(),
  outline: z.array(z.string()).optional().default([]),
})

// GET /api/posts - 获取文章列表（管理后台用）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const q = searchParams.get('q')?.trim()
  const seriesOptions = searchParams.get('seriesOptions') === '1'

  if (seriesOptions) {
    const rows = await prisma.series.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    return NextResponse.json({
      series: rows.map((r) => r.name),
      seriesList: rows,
    })
  }

  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20')

  const where: Prisma.PostWhereInput = {}
  if (status) where.status = status
  if (category) where.category = category
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { id: { contains: q } },
    ]
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, summary: true, category: true, subcategory: true,
        series: true, seriesOrder: true, wordCount: true,
        tags: true, status: true, readingTime: true, viewCount: true,
        createdAt: true, updatedAt: true, publishedAt: true, filePath: true,
        seriesLinks: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            series: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.post.count({ where }),
  ])

  type PostRow = typeof posts[0]
  return NextResponse.json({
    posts: posts.map((p: PostRow) => ({
      ...p,
      tags: parseTags(p.tags as string),
      seriesList: p.seriesLinks.map((l) => ({
        id: l.series.id,
        name: l.series.name,
        order: l.order,
      })),
      series: p.seriesLinks[0]?.series.name ?? p.series,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

// POST /api/posts - 创建文章
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()
    const data = CreatePostSchema.parse(body)

    // 检查 slug 是否已存在
    const existing = await prisma.post.findUnique({ where: { id: data.id } })
    if (existing) {
      return NextResponse.json({ error: 'Slug 已存在，请换一个' }, { status: 409 })
    }

    const { readingTime, wordCount } = computePostStats(data.content)
    const publishedAt = data.status === 'PUBLISHED' ? new Date() : null
    const memberships =
      data.seriesMemberships?.map((m) => ({
        name: m.name.trim(),
        order: m.order ?? null,
      })) ??
      (data.series?.trim()
        ? [{ name: data.series.trim(), order: data.seriesOrder ?? null }]
        : [])
    const primary = memberships[0] ?? null
    const series = primary?.name ?? null

    const post = await prisma.post.create({
      data: {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category || 'others',
        subcategory: data.subcategory ?? null,
        series,
        seriesOrder: primary?.order ?? null,
        coverImage: data.coverImage ?? null,
        tags: stringifyTags(data.tags),
        status: data.status,
        summary: data.summary ?? null,
        outline: JSON.stringify(data.outline ?? []),
        readingTime,
        wordCount,
        publishedAt,
      },
    })

    if (memberships.length > 0) {
      await syncPostSeriesMemberships(post.id, memberships)
    }

    try {
      await indexPostById(post.id)
    } catch (err) {
      console.warn(`搜索索引创建失败 (${post.id}):`, err)
    }

    try {
      await indexPostVectors(post.id)
    } catch (err) {
      console.warn(`向量索引创建失败 (${post.id}):`, err)
    }

    if (post.status === 'PUBLISHED') {
      revalidatePublishedContent({ postIds: [post.id] })
      try {
        const slugMap = await buildWikiSlugMap()
        slugMap[post.title.trim()] = post.id
        slugMap[post.id] = post.id
        await syncPostLinksForContent(post.id, post.content, slugMap)
      } catch (err) {
        console.warn(`双向链接同步失败 (${post.id}):`, err)
      }
    }

    return NextResponse.json({ success: true, post })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数验证失败', details: error.errors }, { status: 400 })
    }
    console.error('Create post error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
