/** 与静态路由冲突的路径，不可作为专题/旧分类 slug */
export const RESERVED_PATHS = new Set([
  'ask',
  'search',
  'graph',
  'post',
  'admin',
  'api',
  'series',
  'images',
  'uploads',
  'rss.xml',
  'sitemap.xml',
  'robots.txt',
])

export function isReservedPath(segment: string): boolean {
  return RESERVED_PATHS.has(segment.toLowerCase())
}
