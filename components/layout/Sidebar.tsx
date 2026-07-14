import Link from 'next/link'
import { getSeriesCatalogCached, getSidebarDataCached, getHomeSummaryCached } from '@/lib/cached-queries'
import { listSeriesWithCounts } from '@/lib/series-queries'
import HomeHero from '@/components/home/HomeHero'
import HomeDiscovery from '@/components/home/HomeDiscovery'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface SidebarProps {
  summary?: Awaited<ReturnType<typeof getHomeSummaryCached>>
  activeTag?: string
  activeSeriesId?: string
}

export default async function Sidebar({
  summary: summaryProp,
  activeTag,
  activeSeriesId,
}: SidebarProps) {
  const [summary, { popularTags }, seriesList, seriesCounts] = await Promise.all([
    summaryProp ?? getHomeSummaryCached(),
    getSidebarDataCached(),
    getSeriesCatalogCached(12),
    listSeriesWithCounts(),
  ])

  const latestLabel = summary.latestUpdatedAt
    ? formatDistanceToNow(summary.latestUpdatedAt, { addSuffix: true, locale: zhCN })
    : '暂无更新'

  const seriesCount = seriesCounts.length

  return (
    <aside className="space-y-5">
      <HomeHero variant="sidebar" />

      <div className="home-sidebar-stats surface-panel px-4 py-3">
        <div className="home-stats">
          <span>
            <strong>{summary.publishedCount}</strong> 篇
          </span>
          <span>
            <strong>{seriesCount}</strong> 专题
          </span>
          <span>更新 {latestLabel}</span>
        </div>
      </div>

      <HomeDiscovery popularTags={popularTags} activeTag={activeTag} />

      {seriesList.length > 0 && (
        <div className="surface-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="home-sidebar-heading mb-0">专题</h3>
            <Link href="/series" className="text-xs hover:text-[var(--accent)]" style={{ color: 'var(--text-tertiary)' }}>
              全部
            </Link>
          </div>
          <ul className="space-y-2">
            {seriesList.map((s) => {
              const active = activeSeriesId === s.id
              return (
                <li key={s.id}>
                  <Link
                    href={s.href}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-[var(--bg-surface)]"
                    style={{
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                      background: active ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined,
                    }}
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
              )
            })}
          </ul>
        </div>
      )}
    </aside>
  )
}
