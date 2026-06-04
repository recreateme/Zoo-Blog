'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import PostCard from '@/components/post/PostCard'
import type { PostMeta } from '@/types'

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') ?? ''
  const initialTag = searchParams.get('tag') ?? ''
  const initialCategory = searchParams.get('category') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [selectedTag, setSelectedTag] = useState(initialTag)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [results, setResults] = useState<PostMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (q: string, tag: string, category: string) => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (tag) params.set('tag', tag)
      if (category) params.set('category', category)
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      setResults(data.posts ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialQ || initialTag || initialCategory) {
      doSearch(initialQ, initialTag, initialCategory)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (selectedTag) params.set('tag', selectedTag)
    if (selectedCategory) params.set('category', selectedCategory)
    router.replace(`/search?${params}`)
    doSearch(query, selectedTag, selectedCategory)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}
        >
          搜索笔记
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          任意页面按 <kbd className="font-mono text-xs px-1 rounded" style={{ border: '1px solid var(--border-subtle)' }}>Ctrl+K</kbd> 可快速搜索
        </p>
      </div>

      {/* 搜索表单 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题、内容、标签..."
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn btn-primary px-5">搜索</button>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <SlidersHorizontal size={13} style={{ color: 'var(--text-tertiary)' }} />
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              className="badge transition-all"
              style={{
                background: selectedCategory === cat.id ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                color: selectedCategory === cat.id ? 'var(--accent)' : 'var(--text-secondary)',
                border: `1px solid ${selectedCategory === cat.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
              }}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </form>

      {/* 活跃筛选标签 */}
      {(selectedTag || selectedCategory) && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>筛选：</span>
          {selectedTag && (
            <button
              onClick={() => setSelectedTag('')}
              className="badge flex items-center gap-1"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer' }}
            >
              #{selectedTag}<X size={10} />
            </button>
          )}
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory('')}
              className="badge flex items-center gap-1"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer' }}
            >
              {CATEGORIES.find((c) => c.id === selectedCategory)?.name ?? selectedCategory}
              <X size={10} />
            </button>
          )}
        </div>
      )}

      {/* 结果区域 */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      )}

      {!loading && searched && (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>找到 {results.length} 篇笔记</p>
          {results.length === 0 ? (
            <div className="text-center py-20 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-4xl mb-3">🔍</p>
              <p style={{ color: 'var(--text-secondary)' }}>没有找到匹配的笔记</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>换个关键词或清除筛选条件试试</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}
        </>
      )}

      {!searched && (
        <div className="text-center py-20 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-4xl mb-3">✍️</p>
          <p style={{ color: 'var(--text-secondary)' }}>输入关键词搜索你的笔记库</p>
        </div>
      )}
    </div>
  )
}
