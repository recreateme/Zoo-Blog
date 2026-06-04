import Link from 'next/link'
import { BookMarked, ChevronRight } from 'lucide-react'
import { getSeriesCatalog } from '@/lib/series-catalog'

export default async function HomeSeries() {
  const series = await getSeriesCatalog(6)
  if (series.length === 0) return null

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookMarked size={18} style={{ color: 'var(--accent)' }} />
          <h2
            className="text-lg"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}
          >
            专题学习
          </h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          按系列阅读，顺序更清晰
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {series.map((item) => (
          <Link
            key={`${item.category}-${item.name}`}
            href={item.href}
            className="group rounded-xl p-4 transition-colors hover:bg-[var(--bg-surface)]"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                  {item.name}
                </p>
                <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  <span>{item.categoryIcon}</span>
                  <span>{item.categoryName}</span>
                  <span>· {item.postCount} 篇</span>
                </p>
              </div>
              <ChevronRight
                size={16}
                className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--accent)' }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
