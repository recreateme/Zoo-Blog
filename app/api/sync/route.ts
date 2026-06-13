import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runContentSync, getContentSyncStatus } from '@/lib/content-sync'
import { getSearchIndexStats, reindexAllPosts } from '@/lib/search-index'

/**
 * POST /api/sync
 * 以 content/ 为源：新增 / 更新 / 删除（文件移除或 slug 变更）
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const result = await runContentSync()

    let reindexed = 0
    if (result.added + result.updated + result.deleted > 0) {
      try {
        const { indexed } = await reindexAllPosts()
        reindexed = indexed
      } catch {
        /* Meilisearch 未配置时不阻断 */
      }
    }

    const parts = [
      `新增 ${result.added} 篇`,
      `更新 ${result.updated} 篇`,
      `跳过 ${result.skipped} 篇`,
    ]
    if (result.deleted > 0) parts.push(`删除 ${result.deleted} 篇`)
    if (reindexed > 0) parts.push(`索引 ${reindexed} 篇`)

    return NextResponse.json({
      success: true,
      message: `同步完成：${parts.join('，')}`,
      ...result,
      reindexed,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: '同步失败' }, { status: 500 })
  }
}

/** GET /api/sync — 同步与搜索索引状态 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const [status, search] = await Promise.all([
      getContentSyncStatus(),
      getSearchIndexStats(),
    ])

    return NextResponse.json({
      ...status,
      search,
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json({ error: '获取同步状态失败' }, { status: 500 })
  }
}
