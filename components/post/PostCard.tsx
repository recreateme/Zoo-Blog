import Link from 'next/link'
import { Clock, Eye, CalendarDays } from 'lucide-react'
import { cn, formatDate, formatNumber, parseTags } from '@/lib/utils'
import { getCategoryById } from '@/lib/categories'
import Badge from '@/components/ui/Badge'
import type { PostMeta } from '@/types'

interface PostCardProps {
  post: PostMeta
  variant?: 'default' | 'compact' | 'featured'
}

export default function PostCard({ post, variant = 'default' }: PostCardProps) {
  const tags = parseTags(post.tags as unknown as string)
  const category = getCategoryById(post.category)

  if (variant === 'compact') {
    return (
      <Link href={`/post/${post.id}`} className="group block">
        <article className="flex items-start gap-3 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-medium leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {post.title}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {formatDate(post.publishedAt ?? post.createdAt)}
            </p>
          </div>
          {category && (
            <span className="text-lg shrink-0">{category.icon}</span>
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
            className="text-2xl md:text-3xl mb-3 group-hover:text-[var(--accent)] transition-colors"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, lineHeight: 1.3, color: 'var(--text-primary)' }}
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
        <div className="flex items-center justify-between gap-2">
          <Badge variant="category" categoryId={post.category}>
            {category?.name ?? post.category}
          </Badge>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
            {formatDate(post.publishedAt ?? post.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h2
          className="text-lg leading-snug group-hover:text-[var(--accent)] transition-colors"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            color: 'var(--text-primary)',
          }}
        >
          {post.title}
        </h2>

        {/* Summary */}
        {post.summary && (
          <p
            className="text-sm leading-relaxed line-clamp-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {post.summary}
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
