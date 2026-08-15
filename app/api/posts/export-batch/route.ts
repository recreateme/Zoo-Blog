import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/rate-limit'
import { buildPostsExportZip } from '@/lib/post-export-zip'
import { loadPostExportInput } from '@/lib/post-export-load'

export const runtime = 'nodejs'
export const maxDuration = 180
export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  ids: z.array(z.string().min(1).max(120)).min(1).max(50),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const rl = applyRateLimit(req, 'api-posts-export-batch', 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '请求过于频繁' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: '参数无效：需要 1～50 个笔记 id' }, { status: 400 })
  }

  const uniqueIds = Array.from(new Set(body.ids.map((id) => id.trim()).filter(Boolean)))
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: '未选择笔记' }, { status: 400 })
  }

  const inputs = []
  const missing: string[] = []
  for (const id of uniqueIds) {
    const input = await loadPostExportInput(id)
    if (!input) missing.push(id)
    else inputs.push(input)
  }

  if (inputs.length === 0) {
    return NextResponse.json({ error: '所选笔记均不存在', missing }, { status: 404 })
  }

  const zip = await buildPostsExportZip(inputs)
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `notes-export-${stamp}-${inputs.length}.zip`

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      ...(missing.length ? { 'X-Missing-Ids': missing.join(',') } : {}),
    },
  })
}
