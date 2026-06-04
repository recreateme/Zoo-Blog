import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getCategoryById } from '@/lib/categories'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  categoryId?: string
  subcategory?: string | null
  currentTitle: string
}

export default function Breadcrumbs({
  categoryId,
  subcategory,
  currentTitle,
}: BreadcrumbsProps) {
  const category = categoryId ? getCategoryById(categoryId) : undefined
  const items: BreadcrumbItem[] = [
    { label: '首页', href: '/' },
  ]

  if (category) {
    items.push({ label: category.name, href: `/${category.id}` })
  } else if (categoryId) {
    items.push({ label: categoryId, href: `/${categoryId}` })
  }

  if (subcategory?.trim()) {
    items.push({ label: subcategory.trim() })
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
                  className="hover:text-[var(--accent)] transition-colors truncate max-w-[12rem] sm:max-w-none"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'truncate font-medium' : 'truncate max-w-[10rem] sm:max-w-none'}
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
