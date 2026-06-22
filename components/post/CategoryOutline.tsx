import { BookMarked, FolderOpen, Files } from 'lucide-react'
import type { ChapterOutline, OutlineGroup } from '@/lib/category-groups'
import { countPostsInGroup } from '@/lib/category-groups'
import PostCard from '@/components/post/PostCard'
import type { PostMeta } from '@/types'

const GROUP_ICON = {
  series: BookMarked,
  subcategory: FolderOpen,
  other: Files,
} as const

const GROUP_LABEL = {
  series: '教程',
  subcategory: '子分类',
  other: '其他',
} as const

interface CategoryOutlineProps {
  groups: OutlineGroup[]
}

function CompactPostList({
  posts,
  showOrder,
}: {
  posts: PostMeta[]
  showOrder?: boolean
}) {
  return (
    <div className="home-post-list">
      {posts.map((post, i) => (
        <PostCard
          key={post.id}
          post={post}
          variant="compact"
          hideCategory
          orderLabel={showOrder ? (post.seriesOrder ?? i + 1) : undefined}
        />
      ))}
    </div>
  )
}

function ChapterSection({ chapter }: { chapter: ChapterOutline }) {
  return (
    <div id={chapter.id} className="category-chapter scroll-mt-24">
      <div className="category-chapter-header">
        <FolderOpen size={14} style={{ color: 'var(--accent)' }} />
        <h3 className="category-chapter-label">{chapter.title}</h3>
        <span className="text-meta">{chapter.posts.length} 篇</span>
      </div>
      <CompactPostList posts={chapter.posts} showOrder />
    </div>
  )
}

export default function CategoryOutline({ groups }: CategoryOutlineProps) {
  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const Icon = GROUP_ICON[group.type]
        const total = countPostsInGroup(group)
        const hasChapters = (group.chapters?.length ?? 0) > 0

        return (
          <section key={group.id} id={group.id} className="timeline-month scroll-mt-24">
            <div className="timeline-month-header">
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={15} className="shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="text-meta uppercase tracking-widest shrink-0">
                  {GROUP_LABEL[group.type]}
                </span>
                <h2 className="timeline-month-label truncate">{group.title}</h2>
              </div>
              <span className="text-meta shrink-0">
                {total} 篇
                {hasChapters ? ` · ${group.chapters!.length} 章` : ''}
              </span>
            </div>

            {hasChapters ? (
              <div className="space-y-6">
                {group.chapters!.map((chapter) => (
                  <ChapterSection key={chapter.id} chapter={chapter} />
                ))}
                {group.loosePosts && group.loosePosts.length > 0 && (
                  <div>
                    <p className="text-meta mb-2 pl-1">未分章节</p>
                    <CompactPostList posts={group.loosePosts} showOrder />
                  </div>
                )}
              </div>
            ) : (
              <CompactPostList
                posts={group.posts}
                showOrder={group.type === 'series'}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}
