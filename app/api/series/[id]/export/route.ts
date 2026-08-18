import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { applyRateLimit } from '@/lib/rate-limit'
import { buildPostsExportZip } from '@/lib/post-export-zip'
import { loadPostExportInput } from '@/lib/post-export-load'
import { decodeRouteParam } from '@/lib/route-params'

export const runtime = 'nodejs'
export const maxDuration = 180
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const rl = applyRateLimit(req, 'api-series-export', 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '请求过于频繁' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  const seriesId = decodeRouteParam(params.id)
  const series = await prisma.series.findUnique({ where: { id: seriesId } })
  if (!series) {
    return NextResponse.json({ error: '专题不存在' }, { status: 404 })
  }

  const memberships = await prisma.postSeries.findMany({
    where: { seriesId: series.id },
    orderBy: [{ order: 'asc' }, { postId: 'asc' }],
    select: { postId: true },
  })
  if (memberships.length === 0) {
    return NextResponse.json({ error: '专题为空，没有可导出的笔记' }, { status: 404 })
  }

  const inputs = []
  for (const m of memberships) {
    const input = await loadPostExportInput(m.postId)
    if (input) inputs.push(input)
  }
  if (inputs.length === 0) {
    return NextResponse.json({ error: '专题笔记均无法导出' }, { status: 404 })
  }

  const zip = await buildPostsExportZip(inputs)
  const filename = `${series.name}-全部笔记.zip`
  const fallback = `series-${series.id}-notes.zip`

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
