import type { NextRequest } from 'next/server'
import type { Session } from 'next-auth'

/** 后台 Session 或 X-Sync-Secret 头（供 rsync 脚本调用） */
export function isSyncAuthorized(req: NextRequest, session: Session | null): boolean {
  if (session) return true

  const secret = process.env.SYNC_SECRET?.trim()
  if (!secret) return false

  const header = req.headers.get('x-sync-secret')?.trim()
  return header === secret
}
