import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  /** 主专题（多专题时取第一项） */
  seriesId?: string | null
  seriesName?: string | null
  subcategory?: string | null
  currentTitle: string
}

export default function Breadcrumbs({
  seriesId,
  seriesName,
  subcategory,
  currentTitle,
}: BreadcrumbsProps) {
  const name = seriesName?.trim() || null
  const chapterName = subcategory?.trim() || null

  const items: BreadcrumbItem[] = [{ label: '首页', href: '/' }]

  items.push({ label: '专题', href: '/series' })

  if (name && seriesId) {
    items.push({ label: name, href: `/series/${seriesId}` })
  } else if (name) {
    items.push({ label: name })
  }

  if (chapterName) {
    items.push({ label: chapterName })
  }

  items.push({ label: currentTitle })

  return (
    <nav aria-label="面包屑" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight
                  size={12}
                  className="shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-hidden
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-[var(--accent)] transition-colors truncate max-w-[10rem] sm:max-w-[14rem]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'truncate font-medium' : 'truncate max-w-[10rem] sm:max-w-[14rem]'}
                  style={{ color: isLast ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
