import prisma from '@/lib/db'

const FLUSH_INTERVAL_MS = 30_000

const pending = new Map<string, number>()
let timer: ReturnType<typeof setTimeout> | null = null
let flushing = false

/** 记录一次阅读（内存缓冲，定期批量写入 DB） */
export function recordView(slug: string): void {
  pending.set(slug, (pending.get(slug) ?? 0) + 1)
  scheduleFlush()
}

function scheduleFlush(): void {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    void flushPendingViews()
  }, FLUSH_INTERVAL_MS)
}

export async function flushPendingViews(): Promise<void> {
  if (flushing || pending.size === 0) return
  flushing = true
  const batch = new Map(pending)
  pending.clear()

  try {
    await prisma.$transaction(
      Array.from(batch.entries()).map(([id, count]) =>
        prisma.post.update({
          where: { id },
          data: { viewCount: { increment: count } },
        })
      )
    )
  } catch (err) {
    for (const [id, count] of Array.from(batch.entries())) {
      pending.set(id, (pending.get(id) ?? 0) + count)
    }
    console.warn('view count flush failed:', err)
  } finally {
    flushing = false
    if (pending.size > 0) scheduleFlush()
  }
}

/** 测试用：重置缓冲区 */
export function resetViewCountBuffer(): void {
  pending.clear()
  if (timer) clearTimeout(timer)
  timer = null
  flushing = false
}

/** 测试用：读取待刷新的计数 */
export function getPendingViewCounts(): Map<string, number> {
  return new Map(pending)
}
