'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

/** 视口顶部读取线：其上方最近的标题视为当前章节 */
const READ_LINE_PX = 112

export default function TableOfContents({ toc }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const listRef = useRef<HTMLUListElement>(null)
  const flat = useMemo(() => flattenToc(toc), [toc])
  const activeIndex = Math.max(0, flat.findIndex((t) => t.id === activeId))
  const chapterProgress =
    flat.length <= 1 ? 0 : Math.round((activeIndex / (flat.length - 1)) * 100)

  useEffect(() => {
    const ids = new Set(flat.map((t) => t.id))
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]')
    ).filter((el) => ids.has(el.id))

    if (headings.length === 0) return

    const updateActive = () => {
      let current = headings[0].id
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= READ_LINE_PX) {
          current = heading.id
        } else {
          break
        }
      }
      setActiveId((prev) => (prev === current ? prev : current))
    }

    updateActive()
    window.addEventListener('scroll', updateActive, { passive: true })
    window.addEventListener('resize', updateActive, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateActive)
      window.removeEventListener('resize', updateActive)
    }
  }, [flat])

  // 当前章节对应的目录项滚到面板视觉中心
  useEffect(() => {
    if (!activeId || !listRef.current) return
    const list = listRef.current
    const link = list.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(activeId)}"]`
    )
    if (!link) return

    const listRect = list.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    const delta =
      linkRect.top - listRect.top - list.clientHeight / 2 + linkRect.height / 2
    list.scrollTo({ top: list.scrollTop + delta, behavior: 'smooth' })
  }, [activeId])

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
      <ul ref={listRef} className="toc-list space-y-0.5">
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
            data-toc-id={item.id}
            className={cn(
              'toc-link',
              depth === 0 && 'toc-link-h2',
              item.id === activeId && 'toc-link-active'
            )}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
              history.replaceState(null, '', `#${item.id}`)
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
