import { redirect } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'
import { isReservedPath } from '@/lib/reserved-paths'

/**
 * 兼容旧分类 URL：/{categoryId} → /series/{id}
 * 迁移后专题 id 与旧分类 id 对齐（如 computer-vision）。
 */
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }))
}

export const dynamicParams = true

interface Props {
  params: { category: string }
}

export default function LegacyCategoryRedirect({ params }: Props) {
  const id = params.category
  if (isReservedPath(id)) {
    redirect('/')
  }
  redirect(`/series/${id}`)
}
