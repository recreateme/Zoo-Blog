import Link from 'next/link'
import { Clock, Eye, CalendarDays } from 'lucide-react'
import { cn, formatDate, formatNumber, formatWordCount, parseTags } from '@/lib/utils'
import { getCategoryById } from '@/lib/categories'
import Badge from '@/components/ui/Badge'
import { SearchHighlightText } from '@/components/search/SearchHighlightText'
import type { PostMeta } from '@/types'
import type { SearchHighlight } from '@/lib/search-index'

interface PostCardProps {
  post: PostMeta & { highlight?: SearchHighlight }
  variant?: 'default' | 'compact' | 'featured'
  /** compact：分类页等同分类列表时隐藏分类标签与图标 */
  hideCategory?: boolean
  /** compact：教程序号等左侧标注 */
  orderLabel?: string | number
}

export default function PostCard({
  post,
  variant = 'default',
  hideCategory = false,
  orderLabel,
}: PostCardProps) {
  const tags = parseTags(post.tags as unknown as string)
  const category = getCategoryById(post.category)

  if (variant === 'compact') {
    return (
      <Link href={`/post/${post.id}`} className="group block home-post-compact">
        <article
          className={cn(
            'flex items-start gap-3 py-3.5 border-b home-post-compact-inner',
            `badge-cat-${post.category}`
          )}
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {orderLabel != null && (
            <span
              className="shrink-0 text-xs font-medium tabular-nums mt-0.5 w-5 text-right"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
            >
              {orderLabel}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-medium leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}
            >
              <SearchHighlightText html={post.highlight?.title} fallback={post.title} />
            </h3>
            {(post.summary || post.highlight?.summary) && (
              <p
                className="text-xs mt-1 line-clamp-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <SearchHighlightText
                  html={post.highlight?.summary}
                  fallback={post.summary ?? ''}
                />
              </p>
            )}
            <p className="text-xs mt-1.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
              <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
              {!hideCategory && category && (
                <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--cat-fg, var(--accent))' }}>
                  {category.name}
                </span>
              )}
              {hideCategory && post.series?.trim() && (
                <span>{post.series}</span>
              )}
              {post.readingTime != null && post.readingTime > 0 && (
                <span>{post.readingTime} 分钟</span>
              )}
            </p>
          </div>
          {!hideCategory && category && (
            <span className="text-lg shrink-0 opacity-80">{category.icon}</span>
          )}
        </article>
      </Link>
    )
  }

  if (variant === 'featured') {
    return (
      <Link href={`/post/${post.id}`} className="group block">
        <article
          className="card p-6 md:p-8 rounded-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="category" categoryId={post.category}>
              {category?.name ?? post.category}
            </Badge>
          </div>
          <h2
            className="text-display text-2xl md:text-3xl mb-3 group-hover:text-[var(--accent)] transition-colors leading-snug"
          >
            {post.title}
          </h2>
          {post.summary && (
            <p className="text-base leading-relaxed mb-5 line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
              {post.summary}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} />
              {formatDate(post.publishedAt ?? post.createdAt)}
            </span>
            {post.readingTime && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {post.readingTime} 分钟
              </span>
            )}
            {post.viewCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Eye size={13} />
                {formatNumber(post.viewCount)}
              </span>
            )}
          </div>
        </article>
      </Link>
    )
  }

  // Default card
  return (
    <Link href={`/post/${post.id}`} className="group block">
      <article
        className="card rounded-xl p-5 flex flex-col gap-3"
      >
        {/* Top: category + date */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="category" categoryId={post.category}>
              {category?.name ?? post.category}
            </Badge>
            {post.series?.trim() && (
              <Badge>{post.series}</Badge>
            )}
          </div>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
            {formatDate(post.publishedAt ?? post.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h2
          className="text-display text-lg leading-snug group-hover:text-[var(--accent)] transition-colors"
        >
          <SearchHighlightText html={post.highlight?.title} fallback={post.title} />
        </h2>

        {/* Summary */}
        {(post.summary || post.highlight?.summary) && (
          <p
            className="text-sm leading-relaxed line-clamp-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <SearchHighlightText
              html={post.highlight?.summary}
              fallback={post.summary ?? ''}
            />
          </p>
        )}

        {/* Tags + meta */}
        <div className="flex items-center justify-between gap-2 flex-wrap mt-auto pt-1">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="tag">{tag}</Badge>
            ))}
          </div>
          <div
            className="flex items-center gap-3 text-xs shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {post.wordCount != null && post.wordCount > 0 && (
              <span>{formatWordCount(post.wordCount)}</span>
            )}
            {post.readingTime && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {post.readingTime} 分钟
              </span>
            )}
            {post.viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye size={11} />
                {formatNumber(post.viewCount)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
