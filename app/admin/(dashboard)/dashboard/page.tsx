import { Metadata } from 'next'
import { FileText, Send, FileEdit, Eye, Paperclip } from 'lucide-react'
import prisma from '@/lib/db'
import { formatDate, parseTags } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import { getSiteName } from '@/lib/site'

export const metadata: Metadata = { title: '仪表盘 · 管理后台' }

async function getStats() {
  const [totalPosts, publishedPosts, draftPosts, totalAttachments, recentPosts, seriesRows] =
    await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'DRAFT' } }),
      prisma.attachment.count(),
      prisma.post.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true, title: true, status: true,
          tags: true, updatedAt: true, publishedAt: true,
          readingTime: true, viewCount: true, createdAt: true,
          subcategory: true, summary: true,
        },
      }),
      prisma.series.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              posts: {
                where: { post: { status: 'PUBLISHED' } },
              },
            },
          },
        },
      }),
    ])

  const totalViews = await prisma.post.aggregate({ _sum: { viewCount: true } })
  const seriesStats = seriesRows
    .map((s) => ({ id: s.id, name: s.name, count: s._count.posts }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))

  return {
    totalPosts,
    publishedPosts,
    draftPosts,
    totalAttachments,
    totalViews: totalViews._sum.viewCount ?? 0,
    recentPosts: recentPosts.map((p: (typeof recentPosts)[0]) => ({
      ...p,
      tags: parseTags(p.tags as string),
      status: p.status as 'DRAFT' | 'PUBLISHED',
    })),
    seriesStats,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const statCards = [
    { label: '全部笔记', value: stats.totalPosts, icon: FileText, color: 'var(--accent)' },
    { label: '已发布', value: stats.publishedPosts, icon: Send, color: 'var(--status-published-fg)' },
    { label: '草稿', value: stats.draftPosts, icon: FileEdit, color: '#d97706' },
    { label: '总阅读量', value: stats.totalViews, icon: Eye, color: '#7c3aed' },
    { label: '附件数', value: stats.totalAttachments, icon: Paperclip, color: '#0284c7' },
  ]

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <h1 className="admin-page-title">仪表盘</h1>
        <p className="admin-page-lead">欢迎回来，这是 {getSiteName()} 概览</p>
      </header>

      <div className="admin-stat-grid-5">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="admin-stat-card">
            <div className="flex items-center justify-between mb-3">
              <p className="admin-stat-label">{label}</p>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="admin-stat-value">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="admin-panel lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>最近笔记</h2>
            <Link href="/admin/posts" className="text-xs text-meta hover:text-[var(--accent)] transition-colors">
              查看全部 →
            </Link>
          </div>
          <div className="space-y-1">
            {stats.recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/editor/${encodeURIComponent(post.id)}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                    {post.title}
                  </p>
                  <p className="text-xs text-meta mt-0.5">{formatDate(post.updatedAt)}</p>
                </div>
                <Badge variant="status">{post.status}</Badge>
              </Link>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            专题分布
          </h2>
          <div className="space-y-2.5">
            {stats.seriesStats.length === 0 ? (
              <p className="text-xs text-meta">暂无专题归属的已发布笔记</p>
            ) : (
              stats.seriesStats.map((s) => {
                const pct = stats.publishedPosts > 0
                  ? Math.round((s.count / stats.publishedPosts) * 100)
                  : 0
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1">
                      <Link
                        href={`/series/${encodeURIComponent(s.id)}`}
                        className="text-xs text-lead hover:text-[var(--accent)] transition-colors"
                      >
                        {s.name}
                      </Link>
                      <span className="text-xs tabular-nums text-meta">{s.count} 篇</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-surface)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: 'var(--accent)' }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <Link href="/admin/editor" className="btn btn-primary w-full justify-center mt-6 text-sm">
            + 新建笔记
          </Link>
        </div>
      </div>
    </div>
  )
}
