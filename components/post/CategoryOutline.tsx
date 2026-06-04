import Link from 'next/link'
import { BookMarked, FolderOpen, Files } from 'lucide-react'
import type { OutlineGroup } from '@/lib/category-groups'
import { formatDate, formatWordCount } from '@/lib/utils'
import type { PostMeta } from '@/types'

const GROUP_ICON = {
  series: BookMarked,
  subcategory: FolderOpen,
  other: Files,
} as const

const GROUP_LABEL = {
  series: '专题',
  subcategory: '子分类',
  other: '其他',
} as const

interface CategoryOutlineProps {
  groups: OutlineGroup[]
}

function PostRow({ post, index }: { post: PostMeta; index?: number }) {
  return (
    <li>
      <Link
        href={`/post/${post.id}`}
        className="flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors hover:bg-[var(--bg-surface)] group"
      >
        {index != null && (
          <span
            className="shrink-0 text-xs font-medium tabular-nums mt-0.5 w-5"
            style={{ color: 'var(--accent)' }}
          >
            {index}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-sm leading-snug group-hover:text-[var(--accent)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {post.title}
          </p>
          <p className="text-xs mt-0.5 flex flex-wrap gap-x-2" style={{ color: 'var(--text-tertiary)' }}>
            <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
            {post.wordCount != null && post.wordCount > 0 && (
              <span>{formatWordCount(post.wordCount)}</span>
            )}
            {post.readingTime != null && <span>约 {post.readingTime} 分钟</span>}
          </p>
        </div>
      </Link>
    </li>
  )
}

export default function CategoryOutline({ groups }: CategoryOutlineProps) {
  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const Icon = GROUP_ICON[group.type]
        return (
          <section
            key={group.id}
            id={group.id}
            className="rounded-xl overflow-hidden scroll-mt-24"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
            >
              <Icon size={16} style={{ color: 'var(--accent)' }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                {GROUP_LABEL[group.type]}
              </span>
              <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                {group.title}
              </h2>
              <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {group.posts.length} 篇
              </span>
            </div>
            <ul className="py-1">
              {group.posts.map((post, i) => (
                <PostRow
                  key={post.id}
                  post={post}
                  index={group.type === 'series' ? (post.seriesOrder ?? i + 1) : undefined}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
