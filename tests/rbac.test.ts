import { describe, it, expect } from 'vitest'
import { getSessionRole, isAdminSession } from '@/lib/rbac'

describe('rbac', () => {
  it('treats missing role as ADMIN', () => {
    expect(getSessionRole({ user: { id: '1', role: 'ADMIN' } } as never)).toBe('ADMIN')
    expect(isAdminSession({ user: { id: '1', role: 'ADMIN' } } as never)).toBe(true)
  })

  it('restricts EDITOR', () => {
    const editor = { user: { id: '2', role: 'EDITOR' } } as never
    expect(getSessionRole(editor)).toBe('EDITOR')
    expect(isAdminSession(editor)).toBe(false)
  })
})
