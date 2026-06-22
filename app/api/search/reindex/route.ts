import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { reindexAllPosts } from '@/lib/search-index'
import { revalidatePublishedContent } from '@/lib/revalidate-content'
import { applyRateLimit } from '@/lib/rate-limit'
import { isAdminSession } from '@/lib/rbac'

/** POST /api/search/reindex — 手动全量重建搜索索引 */
export async function POST(req: NextRequest) {
  const rl = applyRateLimit(req, 'api-reindex', 5, 60_000)
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

  try {
    const { indexed } = await reindexAllPosts()
    revalidatePublishedContent()
    return NextResponse.json({ success: true, indexed })
  } catch (error) {
    console.error('Reindex error:', error)
    return NextResponse.json({ error: '索引重建失败' }, { status: 500 })
  }
}
