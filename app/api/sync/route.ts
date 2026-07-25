import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runContentSync, getContentSyncStatus } from '@/lib/content-sync'
import { getSearchIndexStats, reindexChangedPosts } from '@/lib/search-index'
import {
  getVectorIndexStats,
  reindexChangedVectors,
} from '@/lib/vector-index'
import { isSyncAuthorized } from '@/lib/sync-auth'
import { acquireSyncLock, SyncLockError } from '@/lib/sync-lock'
import { revalidatePublishedContent } from '@/lib/revalidate-content'
import { applyRateLimit } from '@/lib/rate-limit'
import { isAdminSession } from '@/lib/rbac'
import { migrateNonAsciiPostIds } from '@/lib/post-ops'

function rateLimitResponse(retryAfterSec?: number) {
  return NextResponse.json(
    { error: '请求过于频繁，请稍后再试' },
    {
      status: 429,
      headers: retryAfterSec
        ? { 'Retry-After': String(retryAfterSec) }
        : undefined,
    }
  )
}

/**
 * POST /api/sync
 * 以 content/ 为源：新增 / 更新 / 删除（文件移除或 slug 变更）
 */
export async function POST(req: NextRequest) {
  const rl = applyRateLimit(req, 'api-sync', 10, 60_000)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const session = await getServerSession(authOptions)
  if (!isSyncAuthorized(req, session)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  if (session && !isAdminSession(session)) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  try {
    const lock = await acquireSyncLock()
    try {
      const result = await runContentSync()
      const postIdMigration = await migrateNonAsciiPostIds()
      if (postIdMigration.renamed > 0) {
        console.info(
          `[sync] migrated non-ascii post ids: ${postIdMigration.mapping
            .map((m) => `${m.from}→${m.to}`)
            .join(', ')}`
        )
        result.changedIds.push(...postIdMigration.mapping.map((m) => m.to))
        result.removedIds.push(...postIdMigration.mapping.map((m) => m.from))
      }

      let reindexed = 0
      let indexRemoved = 0
      let vectorChunks = 0
      let vectorRemoved = 0
      const indexErrors: string[] = [...result.indexErrors]

      const hasChanges =
        result.changedIds.length > 0 || result.removedIds.length > 0

      if (hasChanges) {
        try {
          const inc = await reindexChangedPosts(result.removedIds, result.changedIds)
          reindexed = inc.indexed
          indexRemoved = inc.removed
        } catch (err) {
          const msg = `增量索引失败: ${err instanceof Error ? err.message : String(err)}`
          console.warn(msg)
          indexErrors.push(msg)
        }

        try {
          const vec = await reindexChangedVectors(result.removedIds, result.changedIds)
          vectorChunks = vec.chunks
          vectorRemoved = vec.removed
          indexErrors.push(...vec.errors)
        } catch (err) {
          const msg = `增量向量索引失败: ${err instanceof Error ? err.message : String(err)}`
          console.warn(msg)
          indexErrors.push(msg)
        }
      }

      const parts = [
        `新增 ${result.added} 篇`,
        `更新 ${result.updated} 篇`,
        `跳过 ${result.skipped} 篇`,
      ]
      if (result.deleted > 0) parts.push(`删除 ${result.deleted} 篇`)
      if (reindexed > 0) parts.push(`索引 ${reindexed} 篇`)
      if (indexRemoved > 0) parts.push(`移除索引 ${indexRemoved} 篇`)
      if (vectorChunks > 0) parts.push(`向量块 ${vectorChunks} 个`)
      if (vectorRemoved > 0) parts.push(`移除向量 ${vectorRemoved} 篇`)

      if (hasChanges || result.added > 0 || result.updated > 0 || result.deleted > 0) {
        revalidatePublishedContent({
          postIds: result.changedIds,
          removedIds: result.removedIds,
        })
      }

      return NextResponse.json({
        success: true,
        message: `同步完成：${parts.join('，')}`,
        ...result,
        reindexed,
        indexRemoved,
        vectorChunks,
        vectorRemoved,
        indexErrors,
      })
    } finally {
      await lock.release()
    }
  } catch (error) {
    if (error instanceof SyncLockError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Sync error:', error)
    return NextResponse.json({ error: '同步失败' }, { status: 500 })
  }
}

/** GET /api/sync — 同步与搜索索引状态 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSyncAuthorized(req, session)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  if (session && !isAdminSession(session)) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  try {
    const [status, search, vector] = await Promise.all([
      getContentSyncStatus(),
      getSearchIndexStats(),
      getVectorIndexStats(),
    ])

    return NextResponse.json({
      ...status,
      search,
      vector,
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json({ error: '获取同步状态失败' }, { status: 500 })
  }
}
