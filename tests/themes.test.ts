import { describe, it, expect } from 'vitest'
import { SITE_THEMES, SITE_THEME_IDS, isSiteThemeId, themeUsesParticles } from '@/lib/themes'

describe('themes', () => {
  it('includes zhihu as a selectable theme', () => {
    expect(SITE_THEME_IDS).toContain('zhihu')
    expect(SITE_THEMES.find((t) => t.id === 'zhihu')?.label).toBe('知乎')
  })

  it('validates theme ids', () => {
    expect(isSiteThemeId('zhihu')).toBe(true)
    expect(isSiteThemeId('classic')).toBe(true)
    expect(isSiteThemeId('unknown')).toBe(false)
  })

  it('disables particles only for zhihu', () => {
    expect(themeUsesParticles('classic')).toBe(true)
    expect(themeUsesParticles('dark')).toBe(true)
    expect(themeUsesParticles('zhihu')).toBe(false)
    expect(themeUsesParticles(undefined)).toBe(true)
  })
})
