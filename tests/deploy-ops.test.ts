import { describe, it, expect } from 'vitest'
import { getDeployStatus } from '@/lib/deploy-ops'

describe('deploy-ops', () => {
  it('returns status without leaking secrets', async () => {
    const status = await getDeployStatus()
    expect(status).toHaveProperty('gitReady')
    expect(status).toHaveProperty('gitLocalReady')
    expect(status).toHaveProperty('gitSyncHookConfigured')
    expect(status).toHaveProperty('gitSyncMode')
    expect(status).toHaveProperty('vpsReady')
    expect(status).toHaveProperty('deployHookConfigured')
    expect(status).toHaveProperty('hints')
    expect(['local', 'hook', 'none']).toContain(status.gitSyncMode)
    const json = JSON.stringify(status)
    expect(json).not.toMatch(/VPS_PASSWORD/)
    expect(json).not.toMatch(/password/i)
  })
})
