import { Suspense } from 'react'
import { Metadata } from 'next'
import prisma from '@/lib/db'
import { parseTags } from '@/lib/utils'
import PostCard from '@/components/post/PostCard'
import HomeSeries from '@/components/home/HomeSeries'
import Sidebar from '@/components/layout/Sidebar'
import type { PostMeta } from '@/types'

// 构建时数据库可能为空，必须运行时查询才能显示新同步的笔记
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '时间线',
  description: '所有学习笔记按时间倒序展示',
}

async function getPosts(): Promise<PostMeta[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      subcategory: true,
      series: true,
      wordCount: true,
      tags: true,
      status: true,
      readingTime: true,
      viewCount: true,
      createdAt: true,
      publishedAt: true,
    },
  })
  return posts.map((p: { id: string; title: string; summary: string | null; category: string; subcategory: string | null; tags: string; status: string; readingTime: number | null; viewCount: number; createdAt: Date; publishedAt: Date | null }) => ({
    ...p,
    tags: parseTags(p.tags as string),
    status: p.status as 'DRAFT' | 'PUBLISHED',
  }))
}

export default async function HomePage() {
  const posts = await getPosts()

  // 按年月分组
  const grouped = posts.reduce<Record<string, PostMeta[]>>((acc, post) => {
    const date = post.publishedAt ?? post.createdAt
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月`
    if (!acc[key]) acc[key] = []
    acc[key].push(post)
    return acc
  }, {})

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex gap-10">
        {/* 主内容 */}
        <div className="flex-1 min-w-0">
          {/* 页头 */}
          <div className="mb-10">
            <h1
              className="text-3xl mb-2"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, color: 'var(--text-primary)' }}
            >
              {process.env.NEXT_PUBLIC_SITE_NAME ?? '个人知识库'}
            </h1>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              {process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? '记录学习与思考'}
            </p>
          </div>

          {posts.length === 0 ? (
            <div
              className="text-center py-24 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <p className="text-5xl mb-4">📝</p>
              <p style={{ color: 'var(--text-secondary)' }}>还没有笔记，去后台创建第一篇吧</p>
            </div>
          ) : (
            <>
            <HomeSeries />
            {Object.entries(grouped).map(([monthKey, monthPosts]) => (
              <section key={monthKey} className="mb-10 animate-fade-in">
                {/* 月份标题 */}
                <div className="flex items-center gap-3 mb-5">
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}
                  >
                    {monthKey}
                  </h2>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {monthPosts.length} 篇
                  </span>
                </div>

                {/* 当月文章网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {monthPosts.map((post, i) => (
                    <div key={post.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
            </>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-20">
            <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
              <Sidebar />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
