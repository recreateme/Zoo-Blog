'use client'

import type { ReactNode } from 'react'

const MARK_OPEN = '<mark>'
const MARK_CLOSE = '</mark>'

/** 仅渲染 Meilisearch 返回的 <mark> 高亮，其余按纯文本处理 */
export function SearchHighlightText({
  html,
  fallback,
  className,
}: {
  html?: string
  fallback: string
  className?: string
}) {
  if (!html || !html.includes(MARK_OPEN)) {
    return <span className={className}>{fallback}</span>
  }

  const nodes: ReactNode[] = []
  let rest = html
  let key = 0

  while (rest.length > 0) {
    const openIdx = rest.indexOf(MARK_OPEN)
    if (openIdx === -1) {
      nodes.push(<span key={key++}>{rest}</span>)
      break
    }

    if (openIdx > 0) {
      nodes.push(<span key={key++}>{rest.slice(0, openIdx)}</span>)
    }

    rest = rest.slice(openIdx + MARK_OPEN.length)
    const closeIdx = rest.indexOf(MARK_CLOSE)
    if (closeIdx === -1) {
      nodes.push(<span key={key++}>{rest}</span>)
      break
    }

    nodes.push(
      <mark
        key={key++}
        className="rounded-sm px-0.5"
        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
      >
        {rest.slice(0, closeIdx)}
      </mark>
    )
    rest = rest.slice(closeIdx + MARK_CLOSE.length)
  }

  return <span className={className}>{nodes}</span>
}
