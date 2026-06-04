import Link from 'next/link'
import { BookMarked } from 'lucide-react'

interface SeriesPost {
  id: string
  title: string
  seriesOrder: number | null
}

interface SeriesNavProps {
  seriesName: string
  currentId: string
  posts: SeriesPost[]
}

export default function SeriesNav({ seriesName, currentId, posts }: SeriesNavProps) {
  if (posts.length < 2) return null

  return (
    <nav
      className="rounded-xl p-4 mb-8"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      aria-label={`专题：${seriesName}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <BookMarked size={14} style={{ color: 'var(--accent)' }} />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          专题
        </p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {seriesName}
        </p>
      </div>
      <ol className="space-y-0.5">
        {posts.map((p, i) => {
          const isCurrent = p.id === currentId
          const order = p.seriesOrder ?? i + 1
          return (
            <li key={p.id}>
              <Link
                href={`/post/${p.id}`}
                className="flex items-start gap-2 py-1.5 px-2 rounded-md text-sm transition-colors"
                style={{
                  color: isCurrent ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isCurrent ? 'var(--accent-subtle)' : 'transparent',
                  fontWeight: isCurrent ? 500 : 400,
                }}
              >
                <span className="shrink-0 tabular-nums text-xs mt-0.5 w-4" style={{ color: 'var(--text-tertiary)' }}>
                  {order}
                </span>
                <span className="line-clamp-2">{p.title}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
