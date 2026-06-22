'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, FileText } from 'lucide-react'
import { getCategoryName } from '@/lib/categories'
import { cn } from '@/lib/utils'
import type { SearchPostMeta } from '@/lib/search-index'
import { SearchHighlightText } from '@/components/search/SearchHighlightText'
import { OPEN_COMMAND_SEARCH_EVENT } from '@/lib/search-events'

export default function CommandSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchPostMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setActiveIndex(0)
  }, [])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_COMMAND_SEARCH_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_COMMAND_SEARCH_EVENT, onOpen)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (!open) return
      if (e.key === 'Escape') close()
      if (results.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % results.length)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + results.length) % results.length)
      }
      if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault()
        close()
        router.push(`/post/${results[activeIndex].id}`)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close, results, activeIndex, router])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const q = query.trim()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const url = q
          ? `/api/search?q=${encodeURIComponent(q)}`
          : '/api/search?recent=1'
        const res = await fetch(url)
        const data = await res.json()
        setResults(data.posts ?? [])
        setActiveIndex(0)
      } catch {
        setResults([])
      }
      setLoading(false)
    }, q ? 280 : 0)

    return () => clearTimeout(timer)
  }, [query, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="搜索笔记"
    >
      <button
        type="button"
        className="absolute inset-0 cmd-overlay-backdrop"
        onClick={close}
        aria-label="关闭搜索"
      />

      <div className="cmd-dialog">
        <div className="cmd-input-row">
          <Search size={18} style={{ color: 'var(--text-tertiary)' }} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索笔记标题、摘要、正文…"
            className="cmd-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim() && results.length === 0) {
                close()
                router.push(`/search?q=${encodeURIComponent(query.trim())}`)
              }
            }}
          />
          <kbd className="kbd-hint hidden sm:inline">Esc</kbd>
          <button type="button" onClick={close} className="btn btn-ghost p-1.5" aria-label="关闭">
            <X size={16} />
          </button>
        </div>

        <div className="cmd-results">
          {loading && (
            <div
              className="flex items-center justify-center gap-2 py-10 text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Loader2 size={16} className="animate-spin" />
              搜索中…
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              未找到相关笔记
            </p>
          )}

          {!loading && !query.trim() && results.length > 0 && (
            <p className="px-4 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              最近更新
            </p>
          )}

          {!loading && !query.trim() && results.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              输入关键词开始搜索
            </p>
          )}

          {!loading &&
            results.map((post, i) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                onClick={close}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'cmd-result-item',
                  `badge-cat-${post.category}`,
                  i === activeIndex && 'cmd-result-item-active'
                )}
              >
                <FileText
                  size={16}
                  className="shrink-0 mt-0.5"
                  style={{ color: 'var(--cat-fg, var(--accent))' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    <SearchHighlightText
                      html={post.highlight?.title}
                      fallback={post.title}
                    />
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {getCategoryName(post.category)}
                    {post.series ? ` · ${post.series}` : ''}
                    {!post.series && (
                      <>
                        {post.highlight?.summary ? ' · ' : post.summary ? ' · ' : ''}
                        <SearchHighlightText
                          html={post.highlight?.summary}
                          fallback={post.summary ?? ''}
                        />
                      </>
                    )}
                  </p>
                </div>
              </Link>
            ))}
        </div>

        <div className="cmd-footer">
          <span>↑↓ 选择 · Enter 打开</span>
          <span className="flex items-center gap-1">
            <kbd className="kbd-hint">⌃K</kbd>
            <span>唤起</span>
          </span>
        </div>
      </div>
    </div>
  )
}
