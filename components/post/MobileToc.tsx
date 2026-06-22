'use client'

import { useState } from 'react'
import { List } from 'lucide-react'
import TableOfContents from '@/components/post/TableOfContents'
import type { TocItem } from '@/types'

interface MobileTocProps {
  toc: TocItem[]
}

export default function MobileToc({ toc }: MobileTocProps) {
  const [open, setOpen] = useState(false)
  if (toc.length === 0) return null

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mobile-toc-trigger"
      >
        <span className="flex items-center gap-2">
          <List size={16} style={{ color: 'var(--accent)' }} />
          文章目录
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {open ? '收起' : '展开'}
        </span>
      </button>
      {open && (
        <div className="mobile-toc-panel">
          <TableOfContents toc={toc} />
        </div>
      )}
    </div>
  )
}
