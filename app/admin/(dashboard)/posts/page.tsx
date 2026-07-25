'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PenSquare, Trash2, Eye, Search, Plus, Loader2, Download } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import type { PostMeta } from '@/types'

type AdminPostRow = PostMeta & { filePath?: string | null; updatedAt?: Date }

export default function PostsPage() {
  const [posts, setPosts] = useState<AdminPostRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString(), pageSize: '15' })
    if (statusFilter) params.set('status', statusFilter)
    if (search.trim()) params.set('q', search.trim())

    const res = await fetch(`/api/posts?${params}`)
    const data = await res.json()
    setPosts(data.posts ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, statusFilter, search])

  useEffect(() => {
    const timer = setTimeout(() => fetchPosts(), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchPosts, search])

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
    const url = deleteFile
      ? `/api/posts/${encodeURIComponent(post.id)}?deleteFile=1`
      : `/api/posts/${encodeURIComponent(post.id)}`
    await fetch(url, { method: 'DELETE' })
    setDeleting(null)
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
      <div className="flex items-center justify-between mb-6">
        <header>
          <h1 className="admin-page-title">笔记管理</h1>
          <p className="admin-page-lead">
            共 {total} 篇 · 文件绑定笔记以同步为准，后台笔记仅存在于数据库
          </p>
        </header>
        <Link href="/admin/editor" className="btn btn-primary">
          <Plus size={15} /> 新建笔记
        </Link>
      </div>

      <div className="admin-toolbar">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="search"
            placeholder="搜索标题 / slug…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input py-1.5 text-sm w-full pl-8"
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
                    <Link
                      href={`/admin/editor/${post.id}`}
                      className="text-sm font-medium hover:text-[var(--accent)] transition-colors line-clamp-1"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {post.title}
                    </Link>
                    {post.readingTime && (
                      <span className="text-xs mt-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                        约 {post.readingTime} 分钟
                      </span>
                    )}
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
                      <Link href={`/post/${post.id}`} target="_blank" className="btn btn-ghost p-1.5" title="预览">
                        <Eye size={14} />
                      </Link>
                      <Link href={`/admin/editor/${post.id}`} className="btn btn-ghost p-1.5" title="编辑">
                        <PenSquare size={14} />
                      </Link>
                      <a
                        href={`/api/posts/${encodeURIComponent(post.id)}/export`}
                        className="btn btn-ghost p-1.5"
                        title="下载 zip"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        onClick={() => handleDelete(post)}
                        disabled={deleting === post.id}
                        className="btn btn-ghost p-1.5"
                        title="删除"
                        style={{ color: '#dc2626' }}
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
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-meta">
            第 {page} 页，共 {Math.ceil(total / 15)} 页
          </span>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary text-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </button>
            <button
              className="btn btn-secondary text-sm"
              disabled={page >= Math.ceil(total / 15)}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
