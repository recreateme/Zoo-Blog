'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PenSquare, Trash2, Eye, Search, Filter, Plus, Loader2 } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import { formatDateShort, parseTags } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import type { PostMeta } from '@/types'

export default function PostsPage() {
  const [posts, setPosts] = useState<PostMeta[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString(), pageSize: '15' })
    if (statusFilter) params.set('status', statusFilter)
    if (categoryFilter) params.set('category', categoryFilter)

    const res = await fetch(`/api/posts?${params}`)
    const data = await res.json()
    setPosts(data.posts ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, statusFilter, categoryFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定要删除《${title}》吗？此操作不可撤销。`)) return
    setDeleting(id)
    await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    setDeleting(null)
    fetchPosts()
  }

  const filtered = posts.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}
          >
            笔记管理
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            共 {total} 篇笔记
          </p>
        </div>
        <Link href="/admin/editor" className="btn btn-primary">
          <Plus size={15} /> 新建笔记
        </Link>
      </div>

      {/* 过滤栏 */}
      <div
        className="flex flex-wrap items-center gap-3 mb-5 p-3 rounded-xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题…"
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
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="input py-1.5 text-sm w-auto"
        >
          <option value="">全部分类</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-3xl mb-2">📭</p>
            <p>暂无笔记</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['标题', '分类', '状态', '更新时间', '操作'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((post, i) => (
                <tr
                  key={post.id}
                  className="group hover:bg-[var(--bg-surface)] transition-colors"
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: 'var(--bg-elevated)',
                  }}
                >
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
                        约 {post.readingTime} 分钟阅读
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="category" categoryId={post.category}>
                      {CATEGORIES.find((c) => c.id === post.category)?.name ?? post.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="status">{post.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDateShort(post.publishedAt ?? post.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/post/${post.id}`}
                        target="_blank"
                        className="btn btn-ghost p-1.5"
                        title="预览"
                      >
                        <Eye size={14} />
                      </Link>
                      <Link
                        href={`/admin/editor/${post.id}`}
                        className="btn btn-ghost p-1.5"
                        title="编辑"
                      >
                        <PenSquare size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        disabled={deleting === post.id}
                        className="btn btn-ghost p-1.5"
                        title="删除"
                        style={{ color: '#dc2626' }}
                      >
                        {deleting === post.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {total > 15 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            第 {page} 页，共 {Math.ceil(total / 15)} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary text-sm"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / 15)}
              className="btn btn-secondary text-sm"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
