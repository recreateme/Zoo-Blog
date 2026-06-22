import Link from 'next/link'
import { cn, formatDate } from '@/lib/utils'
import { getCategoryName } from '@/lib/categories'
import type { PostMeta } from '@/types'

interface RelatedPostsProps {
  posts: PostMeta[]
  seriesName?: string | null
}

export default function RelatedPosts({ posts, seriesName }: RelatedPostsProps) {
  if (posts.length === 0) return null

  return (
    <section className="related-posts">
      <h2 className="related-posts-title">
        {seriesName ? '同专题笔记' : '相关笔记'}
      </h2>
      <div className="related-posts-grid">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className={cn('related-card', `badge-cat-${post.category}`)}
          >
            <p className="related-card-title">{post.title}</p>
            <p className="related-card-meta">
              {getCategoryName(post.category)}
              {' · '}
              {formatDate(post.publishedAt ?? post.createdAt)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
