import { Metadata } from 'next'
import Link from 'next/link'
import { listSeriesWithCounts } from '@/lib/series-queries'
import { getSiteName } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '专题',
  description: `${getSiteName()} 专题列表`,
}

export default async function SeriesIndexPage() {
  const series = await listSeriesWithCounts()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-display text-2xl sm:text-3xl mb-2">专题</h1>
        <p className="text-lead text-sm" style={{ color: 'var(--text-secondary)' }}>
          按专题顺序阅读笔记。同一篇笔记可同时属于多个专题。
        </p>
      </header>

      {series.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)' }}>暂无专题</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {series.map((s) => (
            <li key={s.id}>
              <Link
                href={`/series/${s.id}`}
                className="block rounded-xl p-4 transition-colors hover:bg-[var(--bg-surface)]"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {s.name}
                  </h2>
                  <span className="text-meta shrink-0">{s.postCount} 篇</span>
                </div>
                {s.description && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                    {s.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
