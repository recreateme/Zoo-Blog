import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PostCard from '@/components/post/PostCard'
import EmptyState from '@/components/ui/EmptyState'
import {
  getSeriesBySlug,
  getSeriesPostsPage,
} from '@/lib/series-queries'
import { PAGE_REVALIDATE } from '@/lib/cache-tags'

export const revalidate = PAGE_REVALIDATE.category

const PAGE_SIZE = 20

interface Props {
  params: { slug: string }
  searchParams: { page?: string; q?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const series = await getSeriesBySlug(params.slug)
  if (!series) return { title: '专题不存在' }
  return {
    title: series.name,
    description: series.description ?? `专题「${series.name}」下的笔记`,
  }
}

export default async function SeriesDetailPage({ params, searchParams }: Props) {
  const series = await getSeriesBySlug(params.slug)
  if (!series) notFound()

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const q = searchParams.q?.trim() ?? ''
  const { posts, total } = await getSeriesPostsPage(series.id, page, PAGE_SIZE, q || undefined)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/series/${series.id}?${qs}` : `/series/${series.id}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <nav className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
        <Link href="/" className="hover:text-[var(--accent)]">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/series" className="hover:text-[var(--accent)]">
          专题
        </Link>
        <span className="mx-1.5">/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{series.name}</span>
      </nav>

      <header className="mb-6 pb-4 border-b border-[var(--border-subtle)]">
        <h1 className="text-display text-2xl sm:text-3xl mb-2">{series.name}</h1>
        {series.description && (
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {series.description}
          </p>
        )}
        <p className="text-meta">共 {total} 篇{q ? ` · 搜索「${q}」` : ''}</p>

        <form className="mt-4 flex gap-2 max-w-md" action={`/series/${series.id}`} method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="在本专题中搜索…"
            className="flex-1 px-3 py-2 text-sm rounded-lg"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
          <button type="submit" className="btn btn-secondary text-sm">
            搜索
          </button>
          {q && (
            <Link href={`/series/${series.id}`} className="btn btn-ghost text-sm">
              清除
            </Link>
          )}
        </form>
      </header>

      {posts.length === 0 ? (
        <EmptyState
          title={q ? '没有匹配的笔记' : '该专题暂无已发布笔记'}
          description={q ? '试试其他关键词，或清除搜索。' : '可在后台将笔记加入此专题。'}
          actionHref={q ? `/series/${series.id}` : '/admin/posts'}
          actionLabel={q ? '查看全部' : '前往后台'}
        />
      ) : (
        <>
          <div className="home-post-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} variant="compact" prominent />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)] mt-6">
              <p className="text-meta">
                第 {page} / {totalPages} 页
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} className="btn btn-secondary text-sm">
                    上一页
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={pageHref(page + 1)} className="btn btn-secondary text-sm">
                    下一页
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
