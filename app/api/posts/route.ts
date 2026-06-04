import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { parseTags, stringifyTags, computePostStats } from '@/lib/utils'
import { z } from 'zod'

const CreatePostSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  content: z.string(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  series: z.string().optional(),
  seriesOrder: z.number().int().optional(),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  summary: z.string().optional(),
})

// GET /api/posts - 获取文章列表（管理后台用）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (status) where.status = status
  if (category) where.category = category

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
        createdAt: true, updatedAt: true, publishedAt: true,
      },
    }),
    prisma.post.count({ where }),
  ])

  type PostRow = typeof posts[0]
  return NextResponse.json({
    posts: posts.map((p: PostRow) => ({ ...p, tags: parseTags(p.tags as string) })),
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
    const series = data.series?.trim() || null

    const post = await prisma.post.create({
      data: {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        subcategory: data.subcategory ?? null,
        series,
        seriesOrder: series ? (data.seriesOrder ?? null) : null,
        tags: stringifyTags(data.tags),
        status: data.status,
        summary: data.summary ?? null,
        readingTime,
        wordCount,
        publishedAt,
      },
    })

    return NextResponse.json({ success: true, post })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数验证失败', details: error.errors }, { status: 400 })
    }
    console.error('Create post error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
