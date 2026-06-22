import type { Session } from 'next-auth'

export type AppRole = 'ADMIN' | 'EDITOR'

export function getSessionRole(session: Session | null): AppRole {
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === 'EDITOR' ? 'EDITOR' : 'ADMIN'
}

export function isAdminSession(session: Session | null): boolean {
  return !!session && getSessionRole(session) === 'ADMIN'
}
