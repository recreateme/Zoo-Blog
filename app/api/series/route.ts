import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { slugifySeriesName } from '@/lib/series-ops'
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  coverImage: z.string().nullable().optional(),
  id: z.string().min(1).max(80).optional(),
})

const PatchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  coverImage: z.string().nullable().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const series = await prisma.series.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { posts: { where: { post: { status: 'PUBLISHED' } } } },
      },
    },
  })

  return NextResponse.json({
    series: series.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      coverImage: s.coverImage,
      postCount: s._count.posts,
      updatedAt: s.updatedAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const data = CreateSchema.parse(await req.json())
    const name = data.name.trim()
    const dup = await prisma.series.findUnique({ where: { name } })
    if (dup) {
      return NextResponse.json({ error: '专题名已存在' }, { status: 409 })
    }

    let id = data.id?.trim() || slugifySeriesName(name)
    let n = 0
    while (await prisma.series.findUnique({ where: { id } })) {
      n += 1
      id = `${slugifySeriesName(name)}-${n}`
    }

    const created = await prisma.series.create({
      data: {
        id,
        name,
        description: data.description ?? null,
        coverImage: data.coverImage ?? null,
      },
    })
    return NextResponse.json({ success: true, series: created })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 })
    }
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const data = PatchSchema.parse(await req.json())
    const existing = await prisma.series.findUnique({ where: { id: data.id } })
    if (!existing) return NextResponse.json({ error: '专题不存在' }, { status: 404 })

    if (data.name && data.name.trim() !== existing.name) {
      const clash = await prisma.series.findUnique({ where: { name: data.name.trim() } })
      if (clash) return NextResponse.json({ error: '专题名已存在' }, { status: 409 })
    }

    const updated = await prisma.series.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      },
    })
    return NextResponse.json({ success: true, series: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 })
    }
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  await prisma.postSeries.deleteMany({ where: { seriesId: id } })
  await prisma.series.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ success: true })
}
