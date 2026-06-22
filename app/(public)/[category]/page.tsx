import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCategoryById, CATEGORIES } from '@/lib/categories'
import { buildBreadcrumbJsonLd, buildCategoryJsonLd, defaultOgImageUrl } from '@/lib/seo'
import JsonLd from '@/components/seo/JsonLd'
import {
  CATEGORY_PAGE_SIZE,
  getCategoryPostsPageCached,
  getCategorySummaryCached,
} from '@/lib/cached-queries'
import { PAGE_REVALIDATE } from '@/lib/cache-tags'
import { groupPostsForCategory, getOutlineAnchors } from '@/lib/category-groups'
import CategoryOutline from '@/components/post/CategoryOutline'
import Sidebar from '@/components/layout/Sidebar'
import Breadcrumbs from '@/components/layout/Breadcrumbs'

import { isReservedPath } from '@/lib/reserved-paths'

export const revalidate = PAGE_REVALIDATE.category

/** 仅预渲染已知分类；未知 slug 直接 404，避免与 /ask 等静态路由冲突。
 *  新增分类后需重新 build 才能在生产环境访问。 */
export const dynamicParams = false

interface CategoryPageProps {
  params: { category: string }
  searchParams: { page?: string }
}

export async function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ category: cat.id }))
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const cat = getCategoryById(params.category)
  if (!cat) return { title: '分类不存在' }
  return {
    title: cat.name,
    description: cat.description,
    openGraph: {
      title: cat.name,
      description: cat.description,
      type: 'website',
      images: [{ url: defaultOgImageUrl(), width: 1200, height: 630, alt: cat.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: cat.name,
      description: cat.description,
      images: [defaultOgImageUrl()],
    },
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  if (isReservedPath(params.category)) notFound()

  const cat = getCategoryById(params.category)
  if (!cat) notFound()

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const [{ total, seriesCount }, posts] = await Promise.all([
    getCategorySummaryCached(params.category),
    getCategoryPostsPageCached(params.category, page, CATEGORY_PAGE_SIZE),
  ])

  const totalPages = Math.ceil(total / CATEGORY_PAGE_SIZE)
  if (page > 1 && page > totalPages && total > 0) notFound()

  const groups = groupPostsForCategory(posts)
  const anchors = getOutlineAnchors(groups)

  return (
    <>
      <JsonLd
        data={[
          buildCategoryJsonLd(cat.id, total),
          buildBreadcrumbJsonLd([
            { name: '首页', url: '/' },
            { name: cat.name },
          ]),
        ].filter(Boolean) as Record<string, unknown>[]}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex gap-8 lg:gap-10">
        <div className="flex-1 min-w-0">
          <Breadcrumbs categoryId={cat.id} currentTitle={cat.name} />
          <header className="category-header mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{cat.icon}</span>
              <h1 className="text-display text-2xl sm:text-3xl">{cat.name}</h1>
            </div>
            <p className="text-lead text-sm max-w-2xl">{cat.description}</p>
            <p className="text-meta mt-2">
              共 {total} 篇
              {seriesCount > 0 && ` · ${seriesCount} 个专题`}
              {totalPages > 1 && ` · 第 ${page}/${totalPages} 页`}
            </p>
            {anchors.length > 1 && (
              <nav className="category-anchor-nav" aria-label="大纲跳转">
                {anchors.map((a) => (
                  <a
                    key={a.id}
                    href={`#${a.id}`}
                    className={a.indent ? 'category-anchor-chip category-anchor-indent' : 'category-anchor-chip'}
                  >
                    {a.indent ? `└ ${a.label}` : a.label}
                  </a>
                ))}
              </nav>
            )}
          </header>

          {total === 0 ? (
            <div
              className="text-center py-20 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <p className="text-4xl mb-3">{cat.icon}</p>
              <p style={{ color: 'var(--text-secondary)' }}>该分类下还没有笔记</p>
            </div>
          ) : (
            <>
              <CategoryOutline groups={groups} />
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)]">
                  <p className="text-meta">
                    第 {page} / {totalPages} 页
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={page === 2 ? `/${cat.id}` : `/${cat.id}?page=${page - 1}`}
                        className="btn btn-secondary text-sm"
                      >
                        上一页
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link href={`/${cat.id}?page=${page + 1}`} className="btn btn-secondary text-sm">
                        下一页
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="hidden lg:block w-64 xl:w-72 shrink-0">
          <div className="sticky top-20">
            <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
              <Sidebar />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
