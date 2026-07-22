import { revalidatePath, revalidateTag } from 'next/cache'
import { CATEGORIES } from '@/lib/categories'
import { CACHE_TAG } from '@/lib/cache-tags'

/** 内容变更后失效公开页缓存（同步、后台 CRUD 后调用） */
export function revalidatePublishedContent(opts?: {
  postIds?: string[]
  removedIds?: string[]
  seriesIds?: string[]
}) {
  revalidateTag(CACHE_TAG.posts)
  revalidateTag(CACHE_TAG.home)
  revalidateTag(CACHE_TAG.sidebar)
  revalidatePath('/')
  revalidatePath('/series')

  for (const cat of CATEGORIES) {
    revalidateTag(CACHE_TAG.category(cat.id))
    revalidatePath(`/${cat.id}`)
  }

  const ids = Array.from(
    new Set([...(opts?.postIds ?? []), ...(opts?.removedIds ?? [])])
  )
  for (const id of ids) {
    revalidateTag(CACHE_TAG.post(id))
    revalidatePath(`/post/${id}`)
  }

  // 专题页：按 id 与 name 都失效（中文 id 可能被编码进 URL）
  if (opts?.seriesIds?.length) {
    for (const sid of opts.seriesIds) {
      revalidatePath(`/series/${sid}`)
      revalidatePath(`/series/${encodeURIComponent(sid)}`)
    }
  } else {
    revalidatePath('/series', 'layout')
  }
}
