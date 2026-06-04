import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseTags } from '@/lib/utils'
import type { PostMeta } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim() ?? ''
  const tag = searchParams.get('tag')?.trim() ?? ''
  const category = searchParams.get('category')?.trim() ?? ''
  const series = searchParams.get('series')?.trim() ?? ''
  const recent = searchParams.get('recent') === '1'

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: 'PUBLISHED' }

    if (category) where.category = category
    if (series) where.series = series

    if (q || tag) {
      const conditions = []
      if (q) {
        conditions.push(
          { title: { contains: q } },
          { summary: { contains: q } },
          { content: { contains: q } },
          { tags: { contains: q } }
        )
      }
      if (tag) {
        conditions.push({ tags: { contains: `"${tag}"` } })
      }
      if (conditions.length > 0) {
        where.OR = conditions
      }
    } else if (!recent && !category && !series) {
      return NextResponse.json({ posts: [], total: 0 })
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: recent ? 8 : 50,
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
        subcategory: true,
        series: true,
        tags: true,
        status: true,
        readingTime: true,
        viewCount: true,
        createdAt: true,
        publishedAt: true,
      },
    })

    const result: PostMeta[] = posts.map((p) => ({
      ...p,
      tags: parseTags(p.tags as string),
      status: p.status as 'DRAFT' | 'PUBLISHED',
    }))

    return NextResponse.json({ posts: result, total: result.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
}
