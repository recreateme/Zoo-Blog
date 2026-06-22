import prisma from '@/lib/db'

const LOCK_KEY = 'sync.lock.content'
const STALE_MS = 10 * 60 * 1000

export class SyncLockError extends Error {
  constructor(message = '内容同步正在进行中，请稍后重试') {
    super(message)
    this.name = 'SyncLockError'
  }
}

interface LockPayload {
  holder: string
  at: number
}

function parseLock(value: string): LockPayload | null {
  try {
    const data = JSON.parse(value) as LockPayload
    if (typeof data.holder === 'string' && typeof data.at === 'number') return data
  } catch {
    /* ignore */
  }
  return null
}

/**
 * 基于 SQLite（SiteConfig）的同步互斥锁，适配多实例部署。
 * 完成后调用 release()。
 */
export async function acquireSyncLock(): Promise<{ release: () => Promise<void> }> {
  const holder = `${process.pid}:${Date.now()}`
  const now = Date.now()

  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await prisma.siteConfig.findUnique({ where: { key: LOCK_KEY } })
    if (existing) {
      const payload = parseLock(existing.value)
      if (payload && now - payload.at < STALE_MS) {
        throw new SyncLockError()
      }
      await prisma.siteConfig.delete({ where: { key: LOCK_KEY } }).catch(() => {})
    }

    try {
      await prisma.siteConfig.create({
        data: { key: LOCK_KEY, value: JSON.stringify({ holder, at: now } satisfies LockPayload) },
      })
      return {
        release: async () => {
          const cur = await prisma.siteConfig.findUnique({ where: { key: LOCK_KEY } })
          if (!cur) return
          const payload = parseLock(cur.value)
          if (payload?.holder === holder) {
            await prisma.siteConfig.delete({ where: { key: LOCK_KEY } }).catch(() => {})
          }
        },
      }
    } catch {
      if (attempt === 1) throw new SyncLockError()
    }
  }

  throw new SyncLockError()
}
