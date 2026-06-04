import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PostAdjacency } from '@/lib/post-navigation'

interface PostNavProps {
  adjacency: PostAdjacency
}

export default function PostNav({ adjacency }: PostNavProps) {
  const { prev, next } = adjacency
  if (!prev && !next) return null

  return (
    <nav
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-12 pt-8"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
      aria-label="文章导航"
    >
      {prev ? (
        <Link
          href={`/post/${prev.id}`}
          className="group rounded-xl p-4 transition-colors hover:bg-[var(--bg-surface)]"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span
            className="flex items-center gap-1 text-xs mb-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <ChevronLeft size={14} />
            上一篇
          </span>
          <span
            className="text-sm line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/post/${next.id}`}
          className="group rounded-xl p-4 text-right transition-colors hover:bg-[var(--bg-surface)] sm:col-start-2"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span
            className="flex items-center justify-end gap-1 text-xs mb-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            下一篇
            <ChevronRight size={14} />
          </span>
          <span
            className="text-sm line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {next.title}
          </span>
        </Link>
      ) : null}
    </nav>
  )
}
