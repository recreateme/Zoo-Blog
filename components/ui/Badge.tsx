import { cn } from '@/lib/utils'
import { CATEGORY_MAP } from '@/lib/categories'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'category' | 'tag' | 'status' | 'default'
  categoryId?: string
}

export default function Badge({ children, className, variant = 'default', categoryId }: BadgeProps) {
  if (variant === 'category' && categoryId) {
    const cat = CATEGORY_MAP[categoryId]
    return (
      <span className={cn('badge', cat?.color, cat?.bgColor, className)}>
        {cat?.icon && <span>{cat.icon}</span>}
        {children}
      </span>
    )
  }

  if (variant === 'tag') {
    return (
      <span
        className={cn('badge', className)}
        style={{
          background: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        #{children}
      </span>
    )
  }

  if (variant === 'status') {
    const isDraft = children === 'DRAFT' || children === '草稿'
    return (
      <span
        className={cn('badge', className)}
        style={{
          background: isDraft ? 'var(--bg-sunken)' : '#dcfce7',
          color: isDraft ? 'var(--text-tertiary)' : '#16a34a',
        }}
      >
        {isDraft ? '草稿' : '已发布'}
      </span>
    )
  }

  return (
    <span
      className={cn('badge', className)}
      style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
    >
      {children}
    </span>
  )
}
