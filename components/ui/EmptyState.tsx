import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  compact?: boolean
  className?: string
}

export default function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'surface-panel text-center px-6',
        compact ? 'empty-state-compact' : 'py-20',
        className
      )}
    >
      <p className="text-display text-lg mb-2">{title}</p>
      <p className="text-lead text-sm mb-6 max-w-sm mx-auto">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn btn-primary text-sm">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
