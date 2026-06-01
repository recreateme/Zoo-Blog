export const SITE_THEMES = [
  { id: 'classic', label: '经典', description: '暖白纸感 · 青蓝粒子' },
  { id: 'dark', label: '暗黑', description: '深色背景 · 琥珀粒子' },
  { id: 'eye', label: '护眼', description: '豆沙绿底 · 森林绿粒子' },
  { id: 'parchment', label: '羊皮卷', description: '复古纸色 · 赭石粒子' },
  { id: 'ink', label: '墨韵', description: '冷灰纸感 · 靛蓝粒子' },
] as const

export type SiteThemeId = (typeof SITE_THEMES)[number]['id']

export const SITE_THEME_IDS: SiteThemeId[] = SITE_THEMES.map((t) => t.id)

export function isSiteThemeId(value: string): value is SiteThemeId {
  return SITE_THEME_IDS.includes(value as SiteThemeId)
}
