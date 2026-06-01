import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, Clock, Eye, ArrowLeft, Tag } from 'lucide-react'
import prisma from '@/lib/db'
import { parseMarkdown } from '@/lib/markdown'
import { parseTags, formatDate, formatNumber } from '@/lib/utils'
import { getCategoryById } from '@/lib/categories'
import Badge from '@/components/ui/Badge'
import TableOfContents from '@/components/post/TableOfContents'
import MarkdownRenderer from '@/components/post/MarkdownRenderer'
import ReadingProgress from '@/components/post/ReadingProgress'
import PostCard from '@/components/post/PostCard'
import type { PostMeta } from '@/types'

interface PostPageProps {
  params: { slug: string }
}

async function getPost(slug: string) {
  const post = await prisma.post.findUnique({
    where: { id: slug, status: 'PUBLISHED' },
  })
  return post
}

async function getRelatedPosts(postId: string, category: string): Promise<PostMeta[]> {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', category, id: { not: postId } },
    orderBy: { publishedAt: 'desc' },
    take: 4,
    select: {
      id: true, title: true, summary: true, category: true, subcategory: true,
      tags: true, status: true, readingTime: true, viewCount: true,
      createdAt: true, publishedAt: true,
    },
  })
  return posts.map((p: { id: string; title: string; summary: string | null; category: string; subcategory: string | null; tags: string; status: string; readingTime: number | null; viewCount: number; createdAt: Date; publishedAt: Date | null }) => ({
    ...p,
    tags: parseTags(p.tags as string),
    status: p.status as 'DRAFT' | 'PUBLISHED',
  }))
}

async function incrementViewCount(slug: string) {
  await prisma.post.update({
    where: { id: slug },
    data: { viewCount: { increment: 1 } },
  })
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: '文章不存在' }
  const cat = getCategoryById(post.category)
  return {
    title: post.title,
    description: post.summary ?? undefined,
    openGraph: {
      title: post.title,
      description: post.summary ?? undefined,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      tags: parseTags(post.tags),
    },
    other: {
      'article:section': cat?.name ?? post.category,
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.slug)
  if (!post) notFound()

  // 解析 Markdown
  const { content: html, toc } = await parseMarkdown(post.content)
  const tags = parseTags(post.tags)
  const category = getCategoryById(post.category)

  // 并行获取相关文章 + 增加访问量
  const [relatedPosts] = await Promise.all([
    getRelatedPosts(post.id, post.category),
    incrementViewCount(post.id),
  ])

  return (
    <>
      <ReadingProgress />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex gap-12">
          {/* 主内容 */}
          <article className="flex-1 min-w-0">
            {/* 返回按钮 */}
            <Link
              href={category ? `/${category.id}` : '/'}
              className="inline-flex items-center gap-1.5 text-sm mb-6 hover:text-[var(--accent)] transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ArrowLeft size={14} />
              {category ? `返回 ${category.name}` : '返回首页'}
            </Link>

            {/* 文章头部 */}
            <header className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="category" categoryId={post.category}>
                  {category?.name ?? post.category}
                </Badge>
                {post.subcategory && (
                  <Badge>{post.subcategory}</Badge>
                )}
              </div>

              <h1
                className="text-3xl md:text-4xl mb-5 leading-tight"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}
              >
                {post.title}
              </h1>

              {post.summary && (
                <p
                  className="text-lg leading-relaxed mb-5"
                  style={{
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    borderLeft: '3px solid var(--accent)',
                    paddingLeft: '1rem',
                  }}
                >
                  {post.summary}
                </p>
              )}

              {/* Meta */}
              <div
                className="flex flex-wrap items-center gap-4 text-sm pb-6"
                style={{
                  color: 'var(--text-tertiary)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </span>
                {post.readingTime && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    阅读约 {post.readingTime} 分钟
                  </span>
                )}
                {post.viewCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Eye size={13} />
                    {formatNumber(post.viewCount)} 次阅读
                  </span>
                )}
              </div>
            </header>

            {/* 正文 */}
            <MarkdownRenderer html={html} />

            {/* 标签 */}
            {tags.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-2 mt-10 pt-6"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <Tag size={13} style={{ color: 'var(--text-tertiary)' }} />
                {tags.map((tag) => (
                  <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>
                    <Badge variant="tag">{tag}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </article>

          {/* 右侧边栏：目录 */}
          {toc.length > 0 && (
            <aside className="hidden xl:block w-56 shrink-0">
              <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <TableOfContents toc={toc} />
              </div>
            </aside>
          )}
        </div>

        {/* 相关文章 */}
        {relatedPosts.length > 0 && (
          <section className="mt-16">
            <h2
              className="text-lg mb-5"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}
            >
              相关笔记
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedPosts.map((post) => (
                <PostCard key={post.id} post={post} variant="compact" />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
