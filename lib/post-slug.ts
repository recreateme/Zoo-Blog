import GithubSlugger from 'github-slugger'

/** Next.js 动态路由可能传入百分号编码的 slug */
export function normalizeSlugCandidates(raw: string): string[] {
  const out: string[] = []
  const trimmed = raw?.trim() ?? ''
  if (trimmed) out.push(trimmed)
  try {
    const decoded = decodeURIComponent(trimmed)
    if (decoded && decoded !== trimmed) out.push(decoded)
  } catch {
    // 非法 % 序列时保留原值
  }
  return out
}

/**
 * 生成适合 URL 的 ASCII post id。
 * 纯中文等非 ASCII slug 在 Next 动态路由下易因百分号编码查库失败。
 */
export function slugifyPostId(name: string): string {
  const slugger = new GithubSlugger()
  const base = slugger.slug(name.trim()) || 'post'
  const ascii = base
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (ascii.length >= 2) return ascii.slice(0, 80)

  let hash = 0
  const src = name.trim()
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0
  }
  return `post-${hash.toString(36)}`.slice(0, 80)
}

export function isAsciiSlug(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(id)
}
