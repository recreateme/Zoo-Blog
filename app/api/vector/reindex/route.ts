import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { reindexAllVectors, isRagEnabled } from '@/lib/vector-index'
import { applyRateLimit } from '@/lib/rate-limit'
import { isAdminSession } from '@/lib/rbac'

/** POST /api/vector/reindex — 手动全量重建向量索引 */
export async function POST(req: NextRequest) {
  const rl = applyRateLimit(req, 'api-vector-reindex', 3, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  if (!isRagEnabled()) {
    return NextResponse.json(
      { error: 'RAG 未启用，请配置 QDRANT_URL 与 Embedding API' },
      { status: 503 }
    )
  }

  try {
    const result = await reindexAllVectors()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Vector reindex error:', error)
    const message = error instanceof Error ? error.message : '向量索引重建失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
