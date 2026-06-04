import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { getSeriesCatalog } from '@/lib/series-catalog'
import prisma from '@/lib/db'

async function getCategoryStats() {
  const stats = await prisma.post.groupBy({
    by: ['category'],
    where: { status: 'PUBLISHED' },
    _count: { id: true },
  })
  return Object.fromEntries(stats.map((s: { category: string; _count: { id: number } }) => [s.category, s._count.id]))
}

async function getPopularTags() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { tags: true },
  })
  const tagCount: Record<string, number> = {}
  for (const post of posts) {
    try {
      const tags: string[] = JSON.parse(post.tags)
      for (const tag of tags) {
        tagCount[tag] = (tagCount[tag] ?? 0) + 1
      }
    } catch { /* ignore */ }
  }
  return Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }))
}

export default async function Sidebar() {
  const [categoryStats, popularTags, seriesList] = await Promise.all([
    getCategoryStats(),
    getPopularTags(),
    getSeriesCatalog(8),
  ])

  return (
    <aside className="space-y-6">
      {/* 分类 */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        <h3
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}
        >
          分类
        </h3>
        <ul className="space-y-0.5">
          {CATEGORIES.map((cat) => {
            const count = categoryStats[cat.id] ?? 0
            return (
              <li key={cat.id}>
                <Link
                  href={`/${cat.id}`}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-[var(--bg-surface)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </span>
                  {count > 0 && (
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 专题 */}
      {seriesList.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}
          >
            专题
          </h3>
          <ul className="space-y-0.5">
            {seriesList.map((s) => (
              <li key={`${s.category}-${s.name}`}>
                <Link
                  href={s.href}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-[var(--bg-surface)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="truncate mr-2">{s.name}</span>
                  <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {s.postCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 热门标签 */}
      {popularTags.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-tertiary)' }}
          >
            热门标签
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {popularTags.map(({ tag, count }) => (
              <Link
                key={tag}
                href={`/search?tag=${encodeURIComponent(tag)}`}
                className="badge transition-colors hover:opacity-80"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {tag}
                <span style={{ color: 'var(--text-tertiary)' }}>{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
