'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, Trash2, Download, Loader2 } from 'lucide-react'

type SeriesItem = {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  postCount: number
}

export default function AdminSeriesPage() {
  const [items, setItems] = useState<SeriesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/series')
      const data = await res.json()
      setItems(data.series ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data.error || '创建失败')
        return
      }
      setName('')
      setDescription('')
      setMsg('已创建')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const exportAll = async (id: string, seriesName: string) => {
    setExportingId(id)
    setMsg('')
    try {
      const res = await fetch(`/api/series/${encodeURIComponent(id)}/export`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMsg(data.error || `导出失败（${res.status}）`)
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') || ''
      const star = /filename\*=UTF-8''([^;]+)/i.exec(cd)
      const quoted = /filename="([^"]+)"/.exec(cd)
      let filename = `${seriesName}-全部笔记.zip`
      if (star?.[1]) {
        try {
          filename = decodeURIComponent(star[1])
        } catch {
          filename = quoted?.[1] || filename
        }
      } else if (quoted?.[1]) {
        filename = quoted[1]
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setMsg('导出失败，请稍后重试')
    } finally {
      setExportingId(null)
    }
  }

  const remove = async (id: string, seriesName: string) => {
    if (!confirm(`删除专题「${seriesName}」？笔记本身不会删除，仅解除归属。`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/series?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        setMsg(data.error || '删除失败')
        return
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl mb-1">专题管理</h1>
          <p className="text-lead text-sm">创建、改名与删除专题；成员顺序可在笔记编辑中设置</p>
        </div>
        <button type="button" className="btn btn-secondary text-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} />
          刷新
        </button>
      </header>

      <form onSubmit={create} className="card p-4 mb-6 space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-1.5">
          <Plus size={14} />
          新建专题
        </h2>
        <input
          className="input w-full"
          placeholder="专题名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input w-full"
          placeholder="简介（可选）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          创建
        </button>
        {msg && <p className="text-sm" style={{ color: 'var(--accent)' }}>{msg}</p>}
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {items.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link
                  href={`/series/${s.id}`}
                  className="font-medium text-sm hover:text-[var(--accent)]"
                  target="_blank"
                >
                  {s.name}
                </Link>
                <p className="text-meta truncate">
                  {s.id} · {s.postCount} 篇
                  {s.description ? ` · ${s.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  onClick={() => exportAll(s.id, s.name)}
                  disabled={busy || exportingId === s.id}
                  title="导出该专题全部笔记"
                >
                  {exportingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  导出全部
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  onClick={() => remove(s.id, s.name)}
                  disabled={busy}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-meta py-6">暂无专题</li>}
        </ul>
      )}
    </div>
  )
}
