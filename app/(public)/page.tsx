import { Suspense } from 'react'
import Link from 'next/link'
import { Metadata } from 'next'
import PostCard from '@/components/post/PostCard'
import HomeSeries from '@/components/home/HomeSeries'
import HomeHero from '@/components/home/HomeHero'
import HomeLatest from '@/components/home/HomeLatest'
import HomeDiscovery from '@/components/home/HomeDiscovery'
import Sidebar from '@/components/layout/Sidebar'
import EmptyState from '@/components/ui/EmptyState'
import { buildWebSiteJsonLd, defaultOgImageUrl } from '@/lib/seo'
import { getSiteName, getSiteDescription, HOME_NAV_LABEL } from '@/lib/site'
import JsonLd from '@/components/seo/JsonLd'
import {
  getHomePostsPage,
  getHomePostsPageFiltered,
  getHomeSummaryCached,
  getSidebarDataCached,
} from '@/lib/cached-queries'
import { PAGE_REVALIDATE } from '@/lib/cache-tags'
import type { PostMeta } from '@/types'

export const revalidate = PAGE_REVALIDATE.home

const siteName = getSiteName()
const siteDescription = getSiteDescription()

export const metadata: Metadata = {
  title: HOME_NAV_LABEL,
  description: siteDescription,
  openGraph: {
    title: `${HOME_NAV_LABEL} · ${siteName}`,
    description: siteDescription,
    type: 'website',
    images: [{ url: defaultOgImageUrl(), width: 1200, height: 630, alt: siteName }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${HOME_NAV_LABEL} · ${siteName}`,
    description: siteDescription,
    images: [defaultOgImageUrl()],
  },
}

const HOME_PAGE_SIZE = 24

interface HomePageProps {
  searchParams: { page?: string; tag?: string }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const activeTag = searchParams.tag?.trim() ?? ''

  const [{ posts, total }, summary, { popularTags }, latestPage] = await Promise.all([
    getHomePostsPageFiltered(page, HOME_PAGE_SIZE, activeTag || undefined),
    getHomeSummaryCached(),
    getSidebarDataCached(),
    activeTag ? Promise.resolve(null) : getHomePostsPage(1, 1),
  ])

  const postMetas: PostMeta[] = posts
  const latestPost = latestPage?.posts[0] ?? null

  const listPosts =
    !activeTag && latestPost && page === 1
      ? postMetas.filter((p) => p.id !== latestPost.id)
      : postMetas

  const grouped = listPosts.reduce<Record<string, PostMeta[]>>((acc, post) => {
    const date = new Date(post.publishedAt ?? post.createdAt)
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月`
    if (!acc[key]) acc[key] = []
    acc[key].push(post)
    return acc
  }, {})

  const totalPages = Math.ceil(total / HOME_PAGE_SIZE)

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (activeTag) params.set('tag', activeTag)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  return (
    <>
      <JsonLd data={buildWebSiteJsonLd()} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex gap-8 lg:gap-10">
          <div className="flex-1 min-w-0">
            <HomeHero />

            <div className="lg:hidden mb-6">
              <HomeDiscovery popularTags={popularTags} activeTag={activeTag || undefined} />
            </div>

            {activeTag && (
              <div className="home-active-filter mb-6">
                <span className="text-meta">筛选标签</span>
                <span className="home-tag home-tag-active home-tag-md">{activeTag}</span>
                <Link href="/" className="btn btn-ghost text-xs px-2">
                  清除
                </Link>
              </div>
            )}

            {postMetas.length === 0 ? (
              <EmptyState
                title={activeTag ? `没有标签「${activeTag}」的笔记` : '暂无已发布笔记'}
                description={
                  activeTag
                    ? '试试其他标签，或清除筛选浏览全部内容。'
                    : '在后台创建并发布第一篇笔记，或通过文件同步导入 content/ 目录中的 Markdown。'
                }
                actionHref={activeTag ? '/' : '/admin/editor'}
                actionLabel={activeTag ? '浏览全部' : '前往后台创建'}
              />
            ) : (
              <>
                {!activeTag && latestPost && page === 1 && <HomeLatest post={latestPost} />}
                {page === 1 && !activeTag && <HomeSeries />}

                {Object.entries(grouped).map(([monthKey, monthPosts]) => (
                  <section key={monthKey} className="timeline-month animate-fade-in">
                    <div className="timeline-month-header">
                      <h2 className="timeline-month-label">{monthKey}</h2>
                      <span className="text-meta">{monthPosts.length} 篇</span>
                    </div>

                    <div className="home-post-list">
                      {monthPosts.map((post) => (
                        <PostCard key={post.id} post={post} variant="compact" />
                      ))}
                    </div>
                  </section>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)]">
                    <p className="text-meta">
                      第 {page} / {totalPages} 页 · 共 {total} 篇
                      {activeTag ? ` · #${activeTag}` : ''}
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

          <div className="hidden lg:block w-64 xl:w-72 shrink-0">
            <div className="sticky top-20">
              <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
                <Sidebar summary={summary} activeTag={activeTag || undefined} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
