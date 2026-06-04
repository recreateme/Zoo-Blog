import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Suspense } from 'react'
import prisma from '@/lib/db'
import { parseTags } from '@/lib/utils'
import { getCategoryById, CATEGORIES } from '@/lib/categories'
import { groupPostsForCategory } from '@/lib/category-groups'
import CategoryOutline from '@/components/post/CategoryOutline'
import Sidebar from '@/components/layout/Sidebar'
import type { PostMeta } from '@/types'

interface CategoryPageProps {
  params: { category: string }
}

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ category: cat.id }))
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const cat = getCategoryById(params.category)
  if (!cat) return { title: '分类不存在' }
  return { title: cat.name, description: cat.description }
}

async function getCategoryPosts(categoryId: string): Promise<PostMeta[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', category: categoryId },
    orderBy: [{ series: 'asc' }, { seriesOrder: 'asc' }, { publishedAt: 'desc' }],
    select: {
      id: true, title: true, summary: true, category: true, subcategory: true,
      series: true, seriesOrder: true, wordCount: true,
      tags: true, status: true, readingTime: true, viewCount: true,
      createdAt: true, publishedAt: true,
    },
  })
  return posts.map((p) => ({
    ...p,
    tags: parseTags(p.tags as string),
    status: p.status as 'DRAFT' | 'PUBLISHED',
  }))
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const cat = getCategoryById(params.category)
  if (!cat) notFound()

  const posts = await getCategoryPosts(params.category)
  const groups = groupPostsForCategory(posts)
  const seriesCount = groups.filter((g) => g.type === 'series').length

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex gap-10">
        <div className="flex-1 min-w-0">
          <div
            className="rounded-xl p-6 mb-8"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{cat.icon}</span>
              <h1
                className="text-2xl"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}
              >
                {cat.name}
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>{cat.description}</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              共 {posts.length} 篇笔记
              {seriesCount > 0 && ` · ${seriesCount} 个专题`}
            </p>
            {groups.length > 1 && (
              <nav className="mt-4 flex flex-wrap gap-2" aria-label="大纲跳转">
                {groups.map((g) => (
                  <a
                    key={g.id}
                    href={`#${g.id}`}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-[var(--bg-surface)]"
                    style={{
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {g.title}
                  </a>
                ))}
              </nav>
            )}
          </div>

          {posts.length === 0 ? (
            <div
              className="text-center py-20 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <p className="text-4xl mb-3">{cat.icon}</p>
              <p style={{ color: 'var(--text-secondary)' }}>该分类下还没有笔记</p>
            </div>
          ) : (
            <CategoryOutline groups={groups} />
          )}
        </div>

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
