'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { openCommandSearch } from '@/lib/search-events'

export interface TagCount {
  tag: string
  count: number
}

interface HomeDiscoveryProps {
  popularTags: TagCount[]
  activeTag?: string
  className?: string
}

function tagSizeClass(count: number, max: number): string {
  if (max <= 1) return 'home-tag-md'
  const ratio = count / max
  if (ratio >= 0.66) return 'home-tag-lg'
  if (ratio >= 0.33) return 'home-tag-md'
  return 'home-tag-sm'
}

export default function HomeDiscovery({ popularTags, activeTag, className }: HomeDiscoveryProps) {
  const maxCount = popularTags[0]?.count ?? 1

  return (
    <div className={cn('home-discovery', className)}>
      <button
        type="button"
        onClick={openCommandSearch}
        className="home-discovery-search"
        aria-label="打开搜索，快捷键 Ctrl+K"
      >
        <Search size={16} className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <span className="home-discovery-search-placeholder">搜索标题、标签、正文…</span>
        <kbd className="kbd-hint ml-auto shrink-0">⌃K</kbd>
      </button>

      {popularTags.length > 0 && (
        <div className="home-discovery-tags">
          <p className="home-discovery-tags-label">标签</p>
          <div className="home-discovery-tags-list">
            {popularTags.map(({ tag, count }) => {
              const active = activeTag === tag
              return (
                <Link
                  key={tag}
                  href={active ? '/' : `/?tag=${encodeURIComponent(tag)}`}
                  className={cn(
                    'home-tag',
                    tagSizeClass(count, maxCount),
                    active && 'home-tag-active'
                  )}
                >
                  {tag}
                  <span className="home-tag-count">{count}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
