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
    <div className="xl:hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-sm"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
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
        <div
          className="mt-2 rounded-lg p-4 max-h-64 overflow-y-auto"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <TableOfContents toc={toc} />
        </div>
      )}
    </div>
  )
}
