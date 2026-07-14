import { Suspense } from 'react'
import SearchClient from './SearchClient'
import { getSidebarDataCached } from '@/lib/cached-queries'
import { listSeriesWithCounts } from '@/lib/series-queries'

export const metadata = {
  title: '搜索笔记',
  description: '全文搜索所有学习笔记',
}

export default async function SearchPage() {
  const [{ popularTags }, seriesList] = await Promise.all([
    getSidebarDataCached(),
    listSeriesWithCounts(),
  ])

  const seriesOptions = seriesList.map((s) => ({ id: s.id, name: s.name }))

  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="skeleton h-10 rounded-xl mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        </div>
      }
    >
      <SearchClient popularTags={popularTags} seriesOptions={seriesOptions} />
    </Suspense>
  )
}
