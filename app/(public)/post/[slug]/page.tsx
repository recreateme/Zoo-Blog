import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, Clock, Eye, Tag, ExternalLink, Pencil } from 'lucide-react'
import { parseMarkdown } from '@/lib/markdown'
import { parseTags, formatDate, formatNumber, formatWordCount } from '@/lib/utils'
import {
  buildArticleJsonLd,
  buildArticleOpenGraph,
  buildBreadcrumbJsonLd,
  buildPostBreadcrumbItems,
  buildTwitterCard,
} from '@/lib/seo'
import JsonLd from '@/components/seo/JsonLd'
import { getArticleOutline } from '@/lib/outline'
import {
  getPublishedPostCached,
  getRelatedPostsCached,
  getPostAdjacencyCached,
  getSeriesPostsByIdCached,
  getWikiSlugMapCached,
} from '@/lib/cached-queries'
import { PAGE_REVALIDATE } from '@/lib/cache-tags'
import { recordView } from '@/lib/view-count'
import { preprocessWikiLinksInMarkdown } from '@/lib/wiki-links'
import { decodeRouteParam } from '@/lib/route-params'
import Badge from '@/components/ui/Badge'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import TableOfContents from '@/components/post/TableOfContents'
import ArticleOutline from '@/components/post/ArticleOutline'
import MarkdownRenderer from '@/components/post/MarkdownRenderer'
import ReadingProgress from '@/components/post/ReadingProgress'
import PostNav from '@/components/post/PostNav'
import RelatedPosts from '@/components/post/RelatedPosts'
import SeriesNav from '@/components/post/SeriesNav'
import MobileToc from '@/components/post/MobileToc'
import { getEditOnGitHubUrl } from '@/lib/content-links'

export const revalidate = PAGE_REVALIDATE.post

interface PostPageProps {
  params: { slug: string }
}

async function getPost(slug: string) {
  return getPublishedPostCached(decodeRouteParam(slug))
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: '文章不存在' }
  const tags = parseTags(post.tags)
  const primarySeries = post.seriesLinks[0]?.series
  return {
    title: post.title,
    description: post.summary ?? undefined,
    openGraph: buildArticleOpenGraph({
      title: post.title,
      summary: post.summary,
      content: post.content,
      id: post.id,
      publishedAt: post.publishedAt,
      tags,
      coverImage: post.coverImage,
    }),
    twitter: buildTwitterCard({
      title: post.title,
      summary: post.summary,
      content: post.content,
      coverImage: post.coverImage,
    }),
    other: primarySeries
      ? { 'article:section': primarySeries.name }
      : undefined,
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.slug)
  if (!post) notFound()

  const slugMap = await getWikiSlugMapCached()
  const markdownBody = preprocessWikiLinksInMarkdown(post.content, slugMap)

  const { content: html, toc } = await parseMarkdown(markdownBody)
  const tags = parseTags(post.tags)
  const editUrl = getEditOnGitHubUrl(post.filePath)
  const outlineItems = getArticleOutline(post.content, post.summary, post.outline)

  const seriesList = post.seriesLinks.map((l) => ({
    id: l.series.id,
    name: l.series.name,
    order: l.order,
  }))
  const primary = seriesList[0] ?? null
  const seriesIds = seriesList.map((s) => s.id)

  const [relatedPosts, adjacency, seriesPosts] = await Promise.all([
    getRelatedPostsCached(post.id, seriesIds),
    getPostAdjacencyCached(post.id, primary?.id ?? null),
    primary ? getSeriesPostsByIdCached(primary.id) : Promise.resolve([]),
  ])

  recordView(post.id)

  return (
    <>
      <JsonLd
        data={[
          buildArticleJsonLd({
            id: post.id,
            title: post.title,
            summary: post.summary,
            content: post.content,
            publishedAt: post.publishedAt,
            updatedAt: post.updatedAt,
            tags,
            seriesName: primary?.name,
            coverImage: post.coverImage,
            subcategory: post.subcategory,
          }),
          buildBreadcrumbJsonLd(
            buildPostBreadcrumbItems({
              title: post.title,
              seriesId: primary?.id,
              seriesName: primary?.name,
              subcategory: post.subcategory,
            })
          ),
        ]}
      />
      <ReadingProgress />

      <div className="post-page">
        <div className="post-layout">
          <article className="post-article">
            <Breadcrumbs
              seriesId={primary?.id}
              seriesName={primary?.name}
              subcategory={post.subcategory}
              currentTitle={post.title}
            />

            <header className="post-header">
              <div className="post-badges">
                {seriesList.map((s) => (
                  <Link key={s.id} href={`/series/${s.id}`}>
                    <Badge>{s.name}</Badge>
                  </Link>
                ))}
                {post.subcategory && <Badge>{post.subcategory}</Badge>}
              </div>

              <h1 className="post-title">{post.title}</h1>

              {primary && seriesPosts.length > 0 && (
                <SeriesNav
                  seriesName={primary.name}
                  currentId={post.id}
                  posts={seriesPosts}
                />
              )}

              {post.summary && <p className="post-summary">{post.summary}</p>}

              <div className="post-meta">
                <span className="post-meta-item">
                  <CalendarDays size={13} />
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </span>
                {post.wordCount != null && post.wordCount > 0 && (
                  <span>{formatWordCount(post.wordCount)}</span>
                )}
                {post.readingTime && (
                  <span className="post-meta-item">
                    <Clock size={13} />
                    阅读约 {post.readingTime} 分钟
                  </span>
                )}
                {post.viewCount > 0 && (
                  <span className="post-meta-item">
                    <Eye size={13} />
                    {formatNumber(post.viewCount)} 次阅读
                  </span>
                )}
                {editUrl && (
                  <a
                    href={editUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="post-edit-link"
                  >
                    <Pencil size={13} />
                    编辑此页
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </header>

            {post.coverImage && (
              <figure className="post-cover">
                <Image
                  src={post.coverImage}
                  alt={`${post.title} 封面`}
                  width={1200}
                  height={675}
                  priority
                  unoptimized
                  className="post-cover-image"
                />
              </figure>
            )}

            <MobileToc toc={toc} />

            <ArticleOutline items={outlineItems} />

            <MarkdownRenderer html={html} />

            {tags.length > 0 && (
              <div className="post-tags">
                <Tag size={13} style={{ color: 'var(--text-tertiary)' }} />
                {tags.map((tag) => (
                  <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>
                    <Badge variant="tag">{tag}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </article>

          {toc.length > 0 && (
            <aside className="post-sidebar">
              <div className="post-sidebar-inner">
                <TableOfContents toc={toc} />
              </div>
            </aside>
          )}
        </div>

        <PostNav adjacency={adjacency} />

        <RelatedPosts posts={relatedPosts} seriesName={primary?.name ?? null} />
      </div>
    </>
  )
}
