import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { parseTags, stringifyTags } from '@/lib/utils'
import { z } from 'zod'

/** 聚合全部帖子的标签及出现次数 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const posts = await prisma.post.findMany({ select: { tags: true } })
  const counts = new Map<string, number>()
  for (const p of posts) {
    for (const t of parseTags(p.tags)) {
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
  }

  const tags = Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'))

  return NextResponse.json({ tags })
}

const RenameSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  /** merge：目标标签若已存在则合并计数 */
  mode: z.enum(['rename', 'merge']).optional().default('rename'),
})

const DeleteSchema = z.object({
  tag: z.string().min(1),
})

/** 重命名或合并标签 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const data = RenameSchema.parse(await req.json())
    const from = data.from.trim()
    const to = data.to.trim()
    if (from === to) {
      return NextResponse.json({ error: '新旧标签相同' }, { status: 400 })
    }

    const posts = await prisma.post.findMany({ select: { id: true, tags: true } })
    let updated = 0
    for (const p of posts) {
      const tags = parseTags(p.tags)
      if (!tags.includes(from)) continue
      const next = Array.from(
        new Set(tags.map((t) => (t === from ? to : t)).filter(Boolean))
      )
      if (next.length === 0) next.push('未贴标签')
      await prisma.post.update({
        where: { id: p.id },
        data: { tags: stringifyTags(next) },
      })
      updated += 1
    }

    return NextResponse.json({ success: true, updated, mode: data.mode })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 })
    }
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}

/** 从所有帖子中移除某标签；空列表时补「未贴标签」 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const tagParam = req.nextUrl.searchParams.get('tag')
    const bodyTag = tagParam
      ? { tag: tagParam }
      : DeleteSchema.parse(await req.json().catch(() => ({})))
    const tag = bodyTag.tag.trim()

    const posts = await prisma.post.findMany({ select: { id: true, tags: true } })
    let updated = 0
    for (const p of posts) {
      const tags = parseTags(p.tags)
      if (!tags.includes(tag)) continue
      const next = tags.filter((t) => t !== tag)
      if (next.length === 0) next.push('未贴标签')
      await prisma.post.update({
        where: { id: p.id },
        data: { tags: stringifyTags(next) },
      })
      updated += 1
    }

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 })
    }
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
