import { Metadata } from 'next'
import { FileText, Send, FileEdit, Eye, Paperclip } from 'lucide-react'
import prisma from '@/lib/db'
import { CATEGORIES } from '@/lib/categories'
import { formatDate, parseTags } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'

export const metadata: Metadata = { title: '仪表盘 · 管理后台' }

async function getStats() {
  const [totalPosts, publishedPosts, draftPosts, totalAttachments, recentPosts, categoryStats] =
    await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'DRAFT' } }),
      prisma.attachment.count(),
      prisma.post.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true, title: true, status: true, category: true,
          tags: true, updatedAt: true, publishedAt: true,
          readingTime: true, viewCount: true, createdAt: true,
          subcategory: true, summary: true,
        },
      }),
      prisma.post.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { status: 'PUBLISHED' },
      }),
    ])

  const totalViews = await prisma.post.aggregate({ _sum: { viewCount: true } })

  return {
    totalPosts,
    publishedPosts,
    draftPosts,
    totalAttachments,
    totalViews: totalViews._sum.viewCount ?? 0,
    recentPosts: recentPosts.map((p: typeof recentPosts[0]) => ({
      ...p,
      tags: parseTags(p.tags as string),
      status: p.status as 'DRAFT' | 'PUBLISHED',
    })),
    categoryStats,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const statCards = [
    { label: '全部笔记', value: stats.totalPosts, icon: FileText, color: 'var(--accent)' },
    { label: '已发布', value: stats.publishedPosts, icon: Send, color: '#16a34a' },
    { label: '草稿', value: stats.draftPosts, icon: FileEdit, color: '#d97706' },
    { label: '总阅读量', value: stats.totalViews, icon: Eye, color: '#7c3aed' },
    { label: '附件数', value: stats.totalAttachments, icon: Paperclip, color: '#0284c7' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}
        >
          仪表盘
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          欢迎回来，这是你的知识库概览
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近笔记 */}
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>最近笔记</h2>
            <Link
              href="/admin/posts"
              className="text-xs hover:text-[var(--accent)] transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              查看全部 →
            </Link>
          </div>
          <div className="space-y-1">
            {stats.recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/editor/${post.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate group-hover:text-[var(--accent)] transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {post.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDate(post.updatedAt)}
                  </p>
                </div>
                <Badge variant="status">{post.status}</Badge>
              </Link>
            ))}
          </div>
        </div>

        {/* 分类占比 */}
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <h2 className="font-medium text-sm mb-4" style={{ color: 'var(--text-primary)' }}>
            分类分布
          </h2>
          <div className="space-y-2.5">
            {stats.categoryStats
              .sort((a: { category: string; _count: { id: number } }, b: { category: string; _count: { id: number } }) => b._count.id - a._count.id)
              .map((s: { category: string; _count: { id: number } }) => {
                const cat = CATEGORIES.find((c) => c.id === s.category)
                const pct = stats.publishedPosts > 0
                  ? Math.round((s._count.id / stats.publishedPosts) * 100)
                  : 0
                return (
                  <div key={s.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {cat?.icon} {cat?.name ?? s.category}
                      </span>
                      <span className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                        {s._count.id} 篇
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-surface)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: 'var(--accent)' }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>

          {/* 快速创建 */}
          <Link
            href="/admin/editor"
            className="btn btn-primary w-full justify-center mt-6 text-sm"
          >
            + 新建笔记
          </Link>
        </div>
      </div>
    </div>
  )
}
