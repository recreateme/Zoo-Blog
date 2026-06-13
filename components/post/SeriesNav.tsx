import Link from 'next/link'
import { BookMarked, FolderOpen } from 'lucide-react'

export interface SeriesPost {
  id: string
  title: string
  seriesOrder: number | null
  subcategory?: string | null
}

interface SeriesNavProps {
  seriesName: string
  currentId: string
  posts: SeriesPost[]
}

function groupByChapter(posts: SeriesPost[]) {
  const chapters = new Map<string, SeriesPost[]>()
  const loose: SeriesPost[] = []

  for (const p of posts) {
    const ch = p.subcategory?.trim()
    if (ch) {
      const list = chapters.get(ch) ?? []
      list.push(p)
      chapters.set(ch, list)
    } else {
      loose.push(p)
    }
  }

  const sorted = Array.from(chapters.entries()).sort(([a, pa], [b, pb]) => {
    const oa = Math.min(...pa.map((x) => x.seriesOrder ?? 999_999))
    const ob = Math.min(...pb.map((x) => x.seriesOrder ?? 999_999))
    if (oa !== ob) return oa - ob
    return a.localeCompare(b, 'zh-CN')
  })

  return { chapters: sorted, loose }
}

export default function SeriesNav({ seriesName, currentId, posts }: SeriesNavProps) {
  if (posts.length < 2) return null

  const { chapters, loose } = groupByChapter(posts)
  const hasChapters = chapters.length > 0

  const renderPost = (p: SeriesPost, i: number) => {
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
  }

  return (
    <nav
      className="rounded-xl p-4 mb-8"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      aria-label={`教程：${seriesName}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <BookMarked size={14} style={{ color: 'var(--accent)' }} />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
          教程
        </p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {seriesName}
        </p>
      </div>

      {hasChapters ? (
        <div className="space-y-3">
          {chapters.map(([chapterTitle, chapterPosts]) => (
            <div key={chapterTitle}>
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <FolderOpen size={12} style={{ color: 'var(--accent)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {chapterTitle}
                </p>
              </div>
              <ol className="space-y-0.5 pl-2" style={{ borderLeft: '2px solid var(--border-subtle)' }}>
                {chapterPosts.map((p, i) => renderPost(p, i))}
              </ol>
            </div>
          ))}
          {loose.length > 0 && (
            <div>
              <p className="text-xs px-2 mb-1" style={{ color: 'var(--text-tertiary)' }}>
                未分章节
              </p>
              <ol className="space-y-0.5">{loose.map((p, i) => renderPost(p, i))}</ol>
            </div>
          )}
        </div>
      ) : (
        <ol className="space-y-0.5">{posts.map((p, i) => renderPost(p, i))}</ol>
      )}
    </nav>
  )
}
