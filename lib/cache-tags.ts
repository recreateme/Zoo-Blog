/** Next.js 数据缓存 tag，配合 revalidateTag 失效 */
export const CACHE_TAG = {
  posts: 'posts',
  home: 'home',
  sidebar: 'sidebar',
  category: (id: string) => `category:${id}`,
  post: (slug: string) => `post:${slug}`,
} as const

/** 页面级 ISR 秒数 */
export const PAGE_REVALIDATE = {
  home: 300,
  category: 300,
  post: 3600,
} as const
