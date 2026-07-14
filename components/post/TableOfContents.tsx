'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TocItem } from '@/types'

interface TableOfContentsProps {
  toc: TocItem[]
}

function flattenToc(items: TocItem[]): TocItem[] {
  const out: TocItem[] = []
  const walk = (nodes: TocItem[]) => {
    for (const n of nodes) {
      out.push(n)
      if (n.children.length) walk(n.children)
    }
  }
  walk(items)
  return out
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const flat = useMemo(() => flattenToc(toc), [toc])
  const activeIndex = Math.max(0, flat.findIndex((t) => t.id === activeId))
  const chapterProgress =
    flat.length <= 1 ? 0 : Math.round((activeIndex / (flat.length - 1)) * 100)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0% -70% 0%' }
    )

    const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id]')
    headings.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [toc])

  if (toc.length === 0) return null

  return (
    <nav className="toc-nav" aria-label="文章目录">
      <div className="toc-nav-header">
        <p className="toc-nav-label">目录</p>
        {flat.length > 3 && (
          <span className="toc-chapter-progress" title="章节进度">
            {chapterProgress}%
          </span>
        )}
      </div>
      {flat.length > 3 && (
        <div className="toc-progress-track" aria-hidden="true">
          <div className="toc-progress-fill" style={{ width: `${chapterProgress}%` }} />
        </div>
      )}
      <ul className="toc-list space-y-0.5">
        <TocItems items={toc} activeId={activeId} depth={0} />
      </ul>
    </nav>
  )
}

function TocItems({
  items,
  activeId,
  depth,
}: {
  items: TocItem[]
  activeId: string
  depth: number
}) {
  return (
    <>
      {items.map((item) => (
        <li key={item.id} style={{ paddingLeft: depth > 0 ? `${depth * 0.75}rem` : undefined }}>
          <a
            href={`#${item.id}`}
            className={cn(
              'toc-link',
              depth === 0 && 'toc-link-h2',
              item.id === activeId && 'toc-link-active'
            )}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            {item.text}
          </a>
          {item.children.length > 0 && (
            <ul className="space-y-0.5">
              <TocItems items={item.children} activeId={activeId} depth={depth + 1} />
            </ul>
          )}
        </li>
      ))}
    </>
  )
}
