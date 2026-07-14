'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, SlidersHorizontal, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import PostCard from '@/components/post/PostCard'
import EmptyState from '@/components/ui/EmptyState'
import type { SearchPostMeta } from '@/lib/search-index'
import type { TagCount } from '@/components/home/HomeDiscovery'

function buildParams(q: string, tag: string, series: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (tag) params.set('tag', tag)
  if (series) params.set('series', series)
  return params
}

type ViewMode = 'list' | 'grid'

export interface SeriesOption {
  id: string
  name: string
}

interface SearchClientProps {
  popularTags?: TagCount[]
  seriesOptions?: SeriesOption[]
}

export default function SearchClient({
  popularTags = [],
  seriesOptions = [],
}: SearchClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') ?? ''
  const initialTag = searchParams.get('tag') ?? ''
  const initialSeries =
    searchParams.get('series') ?? searchParams.get('category') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [selectedTag, setSelectedTag] = useState(initialTag)
  const [selectedSeries, setSelectedSeries] = useState(initialSeries)
  const [results, setResults] = useState<SearchPostMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const doSearch = useCallback(async (q: string, tag: string, series: string) => {
    setLoading(true)
    setSearched(true)
    try {
      const params = buildParams(q, tag, series)
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      setResults(data.posts ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const syncUrl = useCallback(
    (q: string, tag: string, series: string) => {
      const params = buildParams(q, tag, series)
      const qs = params.toString()
      router.replace(qs ? `/search?${qs}` : '/search')
    },
    [router]
  )

  useEffect(() => {
    if (initialQ || initialTag || initialSeries) {
      doSearch(initialQ, initialTag, initialSeries)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = query.trim()
    if (!q && !selectedTag && !selectedSeries) return

    const timer = setTimeout(() => {
      syncUrl(q, selectedTag, selectedSeries)
      doSearch(q, selectedTag, selectedSeries)
    }, 350)

    return () => clearTimeout(timer)
  }, [query, selectedTag, selectedSeries, doSearch, syncUrl])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    syncUrl(query, selectedTag, selectedSeries)
    doSearch(query, selectedTag, selectedSeries)
  }

  const toggleTag = (tag: string) => {
    const next = selectedTag === tag ? '' : tag
    setSelectedTag(next)
    syncUrl(query, next, selectedSeries)
    doSearch(query, next, selectedSeries)
  }

  const clearTag = () => {
    setSelectedTag('')
    syncUrl(query, '', selectedSeries)
    doSearch(query, '', selectedSeries)
  }

  const clearSeries = () => {
    setSelectedSeries('')
    syncUrl(query, selectedTag, '')
    doSearch(query, selectedTag, '')
  }

  const seriesLabel =
    seriesOptions.find((s) => s.id === selectedSeries)?.name ?? selectedSeries

  return (
    <div className="search-page">
      <header className="search-header">
        <h1 className="text-display text-2xl mb-1">搜索笔记</h1>
        <p className="text-lead text-sm">
          任意页面按 <kbd className="kbd-hint">⌃K</kbd> 可快速搜索
        </p>
      </header>

      <form onSubmit={handleSearch} className="search-form-wide">
        <div className="flex gap-2">
          <div className="search-input-wrap">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题、内容、标签…"
              className="search-input-wide"
            />
          </div>
          <button type="submit" className="btn btn-primary px-5 shrink-0">
            搜索
          </button>
        </div>

        {popularTags.length > 0 && (
          <div className="search-tag-cloud">
            <span className="text-meta shrink-0">标签</span>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map(({ tag, count }) => {
                const active = selectedTag === tag
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn('home-tag home-tag-sm', active && 'home-tag-active')}
                  >
                    {tag}
                    <span className="home-tag-count">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {seriesOptions.length > 0 && (
          <div className="search-filter-row">
            <SlidersHorizontal size={13} style={{ color: 'var(--text-tertiary)' }} />
            {seriesOptions.map((s) => {
              const active = selectedSeries === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSeries(active ? '' : s.id)}
                  className={cn(
                    'badge search-filter-chip',
                    active && 'search-filter-chip-active'
                  )}
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        )}
      </form>

      {(selectedTag || selectedSeries) && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-meta">筛选：</span>
          {selectedTag && (
            <button
              type="button"
              onClick={clearTag}
              className="badge badge-tag flex items-center gap-1 cursor-pointer"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              #{selectedTag}
              <X size={10} />
            </button>
          )}
          {selectedSeries && (
            <button
              type="button"
              onClick={clearSeries}
              className="badge search-filter-chip flex items-center gap-1"
            >
              {seriesLabel}
              <X size={10} />
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="search-results-list">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="search-results-toolbar">
            <p className="search-meta mb-0">找到 {results.length} 篇笔记</p>
            <div className="search-view-toggle" role="group" aria-label="结果视图">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn('search-view-btn', viewMode === 'list' && 'search-view-btn-active')}
                aria-pressed={viewMode === 'list'}
                title="列表视图"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn('search-view-btn', viewMode === 'grid' && 'search-view-btn-active')}
                aria-pressed={viewMode === 'grid'}
                title="卡片视图"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyState
              title="没有找到匹配的笔记"
              description="尝试更换关键词，或取消部分筛选条件后重新搜索"
              actionHref="/"
              actionLabel="浏览所有内容"
            />
          ) : viewMode === 'list' ? (
            <div className="search-results-list">
              {results.map((post) => (
                <PostCard key={post.id} post={post} variant="compact" hideCategory />
              ))}
            </div>
          ) : (
            <div className="search-results-grid">
              {results.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      )}

      {!searched && (
        <EmptyState
          title="输入关键词开始搜索"
          description="支持标题、正文与标签全文检索，也可点击上方标签或专题快速筛选"
        />
      )}
    </div>
  )
}
