import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PostAdjacency } from '@/lib/post-navigation'

interface PostNavProps {
  adjacency: PostAdjacency
}

export default function PostNav({ adjacency }: PostNavProps) {
  const { prev, next } = adjacency
  if (!prev && !next) return null

  return (
    <nav className="post-nav" aria-label="文章导航">
      {prev ? (
        <Link href={`/post/${prev.id}`} className="post-nav-item">
          <span className="post-nav-label">
            <ChevronLeft size={14} />
            上一篇
          </span>
          <span className="post-nav-title">{prev.title}</span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/post/${next.id}`}
          className={cn('post-nav-item', 'post-nav-item-next')}
        >
          <span className="post-nav-label justify-end">
            下一篇
            <ChevronRight size={14} />
          </span>
          <span className="post-nav-title">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  )
}
