'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'

type TagRow = { tag: string; count: number }

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tags')
      const data = await res.json()
      setTags(data.tags ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const rename = async () => {
    if (!from.trim() || !to.trim()) return
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, mode: 'merge' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data.error || '失败')
        return
      }
      setMsg(`已更新 ${data.updated} 篇`)
      setFrom('')
      setTo('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (tag: string) => {
    if (!confirm(`从所有笔记中移除标签「${tag}」？`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/tags?tag=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data.error || '失败')
        return
      }
      setMsg(`已更新 ${data.updated} 篇`)
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl mb-1">标签管理</h1>
          <p className="text-lead text-sm">重命名、合并或删除全站标签</p>
        </div>
        <button type="button" className="btn btn-secondary text-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} />
          刷新
        </button>
      </header>

      <section className="card p-4 mb-6 space-y-3">
        <h2 className="text-sm font-medium">重命名 / 合并</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[6rem]"
            placeholder="原标签"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-meta self-center">→</span>
          <input
            className="input flex-1 min-w-[6rem]"
            placeholder="新标签"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={rename} disabled={busy}>
            应用
          </button>
        </div>
        {msg && <p className="text-sm" style={{ color: 'var(--accent)' }}>{msg}</p>}
      </section>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {tags.map(({ tag, count }) => (
            <li key={tag} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <span className="font-medium text-sm">#{tag}</span>
                <span className="text-meta ml-2">{count} 篇</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  onClick={() => {
                    setFrom(tag)
                    setTo(tag)
                  }}
                >
                  选用
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  onClick={() => remove(tag)}
                  disabled={busy}
                  aria-label={`删除 ${tag}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
          {tags.length === 0 && <li className="text-meta py-6">暂无标签</li>}
        </ul>
      )}
    </div>
  )
}
