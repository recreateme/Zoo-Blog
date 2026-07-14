'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, SlidersHorizontal, LayoutGrid, List } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import { cn } from '@/lib/utils'
import PostCard from '@/components/post/PostCard'
import EmptyState from '@/components/ui/EmptyState'
import type { SearchPostMeta } from '@/lib/search-index'
import type { TagCount } from '@/components/home/HomeDiscovery'

function buildParams(q: string, tag: string, category: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (tag) params.set('tag', tag)
  if (category) params.set('category', category)
  return params
}

type ViewMode = 'list' | 'grid'

interface SearchClientProps {
  popularTags?: TagCount[]
}

export default function SearchClient({ popularTags = [] }: SearchClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') ?? ''
  const initialTag = searchParams.get('tag') ?? ''
  const initialCategory = searchParams.get('category') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [selectedTag, setSelectedTag] = useState(initialTag)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [results, setResults] = useState<SearchPostMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const doSearch = useCallback(async (q: string, tag: string, category: string) => {
    setLoading(true)
    setSearched(true)
    try {
      const params = buildParams(q, tag, category)
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
    (q: string, tag: string, category: string) => {
      const params = buildParams(q, tag, category)
      const qs = params.toString()
      router.replace(qs ? `/search?${qs}` : '/search')
    },
    [router]
  )

  useEffect(() => {
    if (initialQ || initialTag || initialCategory) {
      doSearch(initialQ, initialTag, initialCategory)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = query.trim()
    if (!q && !selectedTag && !selectedCategory) return

    const timer = setTimeout(() => {
      syncUrl(q, selectedTag, selectedCategory)
      doSearch(q, selectedTag, selectedCategory)
    }, 350)

    return () => clearTimeout(timer)
  }, [query, selectedTag, selectedCategory, doSearch, syncUrl])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    syncUrl(query, selectedTag, selectedCategory)
    doSearch(query, selectedTag, selectedCategory)
  }

  const toggleTag = (tag: string) => {
    const next = selectedTag === tag ? '' : tag
    setSelectedTag(next)
    syncUrl(query, next, selectedCategory)
    doSearch(query, next, selectedCategory)
  }

  const clearTag = () => {
    setSelectedTag('')
    syncUrl(query, '', selectedCategory)
    doSearch(query, '', selectedCategory)
  }

  const clearCategory = () => {
    setSelectedCategory('')
    syncUrl(query, selectedTag, '')
    doSearch(query, selectedTag, '')
  }

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

        <div className="search-filter-row">
          <SlidersHorizontal size={13} style={{ color: 'var(--text-tertiary)' }} />
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(active ? '' : cat.id)}
                className={cn(
                  'badge badge-category search-filter-chip',
                  `badge-cat-${cat.id}`,
                  active && 'search-filter-chip-active'
                )}
              >
                {cat.icon} {cat.name}
              </button>
            )
          })}
        </div>
      </form>

      {(selectedTag || selectedCategory) && (
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
          {selectedCategory && (
            <button
              type="button"
              onClick={clearCategory}
              className={cn(
                'badge badge-category search-filter-chip flex items-center gap-1',
                `badge-cat-${selectedCategory}`
              )}
            >
              {CATEGORIES.find((c) => c.id === selectedCategory)?.name ?? selectedCategory}
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
            <p className="search-meta mb-0">
              找到 {results.length} 篇笔记
            </p>
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
                <PostCard key={post.id} post={post} variant="compact" />
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
          description="支持标题、正文与标签全文检索，也可点击上方标签或分类快速筛选"
        />
      )}
    </div>
  )
}
