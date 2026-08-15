'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { PenSquare, Trash2, Eye, Search, Plus, Loader2, Download } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import type { PostMeta } from '@/types'

type AdminPostRow = PostMeta & {
  filePath?: string | null
  updatedAt?: Date
  seriesList?: { id: string; name: string; order: number | null }[]
}

export default function PostsPage() {
  const [posts, setPosts] = useState<AdminPostRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [seriesFilter, setSeriesFilter] = useState('')
  const [seriesOptions, setSeriesOptions] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchDownloading, setBatchDownloading] = useState(false)

  useEffect(() => {
    fetch('/api/posts?seriesOptions=1')
      .then((r) => r.json())
      .then((d) => setSeriesOptions(d.series ?? []))
      .catch(() => {})
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString(), pageSize: '15' })
    if (statusFilter) params.set('status', statusFilter)
    if (seriesFilter) params.set('series', seriesFilter)
    if (search.trim()) params.set('q', search.trim())

    const res = await fetch(`/api/posts?${params}`)
    const data = await res.json()
    setPosts(data.posts ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, statusFilter, seriesFilter, search])

  useEffect(() => {
    const timer = setTimeout(() => fetchPosts(), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchPosts, search])

  useEffect(() => {
    setSelected(new Set())
  }, [page, statusFilter, seriesFilter, search])

  const pageIds = useMemo(() => posts.map((p) => p.id), [posts])
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const somePageSelected = pageIds.some((id) => selected.has(id))

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id)
      } else {
        for (const id of pageIds) next.add(id)
      }
      return next
    })
  }

  const handleBatchDownload = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    if (ids.length > 50) {
      alert('单次最多下载 50 篇，请减少选择')
      return
    }
    setBatchDownloading(true)
    try {
      const res = await fetch('/api/posts/export-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || `下载失败（${res.status}）`)
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') || ''
      const match = /filename="([^"]+)"/.exec(cd)
      const filename = match?.[1] || `notes-export-${ids.length}.zip`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('批量下载失败，请稍后重试')
    } finally {
      setBatchDownloading(false)
    }
  }

  const handleDelete = async (post: AdminPostRow) => {
    if (!confirm(`确定删除《${post.title}》？`)) return

    let deleteFile = false
    if (post.filePath?.trim()) {
      deleteFile = confirm(
        `该笔记绑定文件：${post.filePath}\n\n` +
          '是否同时删除 Markdown 文件？\n' +
          '· 确定 = 删文件 + 数据库（推荐）\n' +
          '· 取消 = 仅删数据库（下次同步会重新入库）'
      )
    }

    setDeleting(post.id)
    const url = deleteFile ? `/api/posts/${post.id}?deleteFile=1` : `/api/posts/${post.id}`
    await fetch(url, { method: 'DELETE' })
    setDeleting(null)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(post.id)
      return next
    })
    fetchPosts()
  }

  const seriesLabel = (post: AdminPostRow) => {
    if (post.seriesList?.length) {
      return post.seriesList.map((s) => s.name).join(' · ')
    }
    return post.series?.trim() || '—'
  }

  return (
    <div className="admin-page">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <header>
          <h1 className="admin-page-title">笔记管理</h1>
          <p className="admin-page-lead">
            共 {total} 篇 · 文件绑定笔记以同步为准，后台笔记仅存在于数据库
          </p>
        </header>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleBatchDownload}
              disabled={batchDownloading}
              title="将选中笔记打包为 ZIP 下载"
            >
              {batchDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              批量下载（{selected.size}）
            </button>
          )}
          <Link href="/admin/editor" className="btn btn-primary">
            <Plus size={15} /> 新建笔记
          </Link>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="搜索标题或 slug…"
            className="input pl-8 py-1.5 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="input py-1.5 text-sm w-auto"
        >
          <option value="">全部状态</option>
          <option value="PUBLISHED">已发布</option>
          <option value="DRAFT">草稿</option>
        </select>

        <select
          value={seriesFilter}
          onChange={(e) => { setSeriesFilter(e.target.value); setPage(1) }}
          className="input py-1.5 text-sm w-auto max-w-[12rem]"
        >
          <option value="">全部专题</option>
          {seriesOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            compact
            title="暂无笔记"
            description="在后台新建笔记，或从 content/ 目录同步 Markdown 文件"
            actionHref="/admin/editor"
            actionLabel="新建笔记"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="admin-table-head">
                <th className="admin-table-th w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected && !allPageSelected
                    }}
                    onChange={togglePage}
                    aria-label="全选本页"
                  />
                </th>
                {['标题', '来源', '专题', '状态', '更新时间', '操作'].map((h) => (
                  <th key={h} className="admin-table-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="admin-table-row group">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(post.id)}
                      onChange={() => toggleOne(post.id)}
                      aria-label={`选择 ${post.title}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/editor/${post.id}`}
                      className="text-sm font-medium hover:text-[var(--accent)] transition-colors line-clamp-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {post.title}
                    </Link>
                    <span className="text-xs mt-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                      {post.id}
                      {post.readingTime ? ` · 约 ${post.readingTime} 分钟` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={post.filePath ? 'tag' : 'status'}>
                      {post.filePath ? '文件' : '后台'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {seriesLabel(post)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="status">{post.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDateShort(post.publishedAt ?? post.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/post/${encodeURIComponent(post.id)}`} target="_blank" className="btn btn-ghost p-1.5" title="预览">
                        <Eye size={14} />
                      </Link>
                      <Link href={`/admin/editor/${post.id}`} className="btn btn-ghost p-1.5" title="编辑">
                        <PenSquare size={14} />
                      </Link>
                      <a
                        href={`/api/posts/${encodeURIComponent(post.id)}/export`}
                        className="btn btn-ghost p-1.5"
                        title="导出 ZIP"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(post)}
                        disabled={deleting === post.id}
                        className="btn btn-ghost p-1.5"
                        title="删除"
                        style={{ color: 'var(--danger, #c44)' }}
                      >
                        {deleting === post.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 15 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            type="button"
            className="btn btn-secondary text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <span className="text-xs self-center text-meta">
            {page} / {Math.ceil(total / 15)}
          </span>
          <button
            type="button"
            className="btn btn-secondary text-sm"
            disabled={page >= Math.ceil(total / 15)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
