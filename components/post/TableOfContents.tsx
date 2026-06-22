'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TocItem } from '@/types'

interface TableOfContentsProps {
  toc: TocItem[]
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

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
    <nav className="text-sm" aria-label="文章目录">
      <p className="toc-nav-label">目录</p>
      <ul className="space-y-0.5">
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
            className={cn('toc-link', item.id === activeId && 'toc-link-active')}
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
