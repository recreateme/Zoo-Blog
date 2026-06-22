import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import Badge from '@/components/ui/Badge'
import { getCategoryById } from '@/lib/categories'
import type { PostMeta } from '@/types'

interface HomeLatestProps {
  post: PostMeta
}

export default function HomeLatest({ post }: HomeLatestProps) {
  const category = getCategoryById(post.category)
  const updatedLabel = formatDistanceToNow(post.publishedAt ?? post.createdAt, {
    addSuffix: true,
    locale: zhCN,
  })

  return (
    <section className="home-latest" aria-label="最近更新">
      <div className="home-latest-eyebrow">
        <span className="home-latest-badge">最近更新</span>
        <span className="text-meta">{updatedLabel}</span>
      </div>
      <Link href={`/post/${post.id}`} className="home-latest-link group">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="category" categoryId={post.category}>
            {category?.name ?? post.category}
          </Badge>
          {post.series?.trim() && <Badge>{post.series}</Badge>}
        </div>
        <h2 className="text-display text-xl sm:text-2xl leading-snug group-hover:text-[var(--accent)] transition-colors">
          {post.title}
        </h2>
        {post.summary && (
          <p className="text-sm leading-relaxed mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {post.summary}
          </p>
        )}
      </Link>
    </section>
  )
}
