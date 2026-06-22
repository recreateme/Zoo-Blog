import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { getSeriesCatalogCached, getSidebarDataCached, getHomeSummaryCached } from '@/lib/cached-queries'
import HomeDiscovery from '@/components/home/HomeDiscovery'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface SidebarProps {
  summary?: Awaited<ReturnType<typeof getHomeSummaryCached>>
  activeTag?: string
}

export default async function Sidebar({ summary: summaryProp, activeTag }: SidebarProps) {
  const [summary, { categoryStats, popularTags }, seriesList] = await Promise.all([
    summaryProp ?? getHomeSummaryCached(),
    getSidebarDataCached(),
    getSeriesCatalogCached(8),
  ])

  const latestLabel = summary.latestUpdatedAt
    ? formatDistanceToNow(summary.latestUpdatedAt, { addSuffix: true, locale: zhCN })
    : '暂无更新'

  return (
    <aside className="space-y-5">
      <div className="home-sidebar-stats surface-panel px-4 py-3">
        <div className="home-stats">
          <span>
            <strong>{summary.publishedCount}</strong> 篇
          </span>
          <span>
            <strong>{summary.categoryCount}</strong> 类
          </span>
          <span>更新 {latestLabel}</span>
        </div>
      </div>

      <HomeDiscovery popularTags={popularTags} activeTag={activeTag} />

      <div className="surface-panel p-5">
        <h3 className="home-sidebar-heading">分类</h3>
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
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {seriesList.length > 0 && (
        <div className="surface-panel p-5">
          <h3 className="home-sidebar-heading">专题</h3>
          <ul className="space-y-3">
            {seriesList.map((s) => (
              <li key={`${s.category}-${s.name}`}>
                <Link
                  href={s.href}
                  className="flex items-center justify-between px-2 py-1 rounded-md text-sm font-medium transition-colors hover:bg-[var(--bg-surface)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span className="truncate mr-2">{s.name}</span>
                  <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {s.postCount}
                  </span>
                </Link>
                {s.chapters.length > 0 && (
                  <ul
                    className="mt-1 ml-2 pl-2 space-y-0.5"
                    style={{ borderLeft: '2px solid var(--border-subtle)' }}
                  >
                    {s.chapters.map((ch) => (
                      <li key={ch.title}>
                        <Link
                          href={ch.href}
                          className="flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors hover:bg-[var(--bg-surface)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <span className="truncate mr-2">{ch.title}</span>
                          <span className="tabular-nums shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                            {ch.postCount}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
