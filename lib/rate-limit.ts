import type { NextRequest } from 'next/server'

interface Bucket {
  count: number
  windowStart: number
}

const store = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  retryAfterSec?: number
}

/** 内存滑动窗口限速（单实例有效；多实例需 Redis） */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now - bucket.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { ok: true }
  }

  if (bucket.count >= limit) {
    const retryAfterSec = Math.ceil((bucket.windowStart + windowMs - now) / 1000)
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) }
  }

  bucket.count += 1
  return { ok: true }
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export function applyRateLimit(
  req: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const ip = getClientIp(req)
  return consumeRateLimit(`${namespace}:${ip}`, limit, windowMs)
}

/** 测试用：清空计数 */
export function resetRateLimitStore(): void {
  store.clear()
}
