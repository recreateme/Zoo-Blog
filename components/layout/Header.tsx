'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Menu, X, ScrollText, ChevronDown, MessageCircle, Network, BookMarked } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getSiteName, HOME_NAV_LABEL } from '@/lib/site'
import { openCommandSearch } from '@/lib/search-events'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'

const NAV_LINKS = [
  { href: '/', label: HOME_NAV_LABEL },
  { href: '/series', label: '专题' },
  { href: '/search', label: '搜索' },
]

const MORE_LINKS = [
  { href: '/ask', label: '问答', icon: MessageCircle },
  { href: '/graph', label: '图谱', icon: Network },
]

export default function Header() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const siteName = getSiteName()
  const seriesActive = pathname === '/series' || pathname.startsWith('/series/')
  const moreActive = MORE_LINKS.some((l) => pathname === l.href)

  return (
    <header className="site-header sticky top-0 z-50 w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
        <Link href="/" className="site-logo flex items-center gap-2 font-semibold shrink-0">
          <ScrollText size={18} style={{ color: 'var(--accent)' }} />
          <span>{siteName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'btn btn-ghost text-sm',
                (href === '/series' ? seriesActive : pathname === href) && 'text-nav-active'
              )}
            >
              {label}
            </Link>
          ))}

          <div className="relative group">
            <button
              type="button"
              className={cn(
                'btn btn-ghost text-sm flex items-center gap-1',
                moreActive && 'text-nav-active'
              )}
            >
              更多
              <ChevronDown size={14} className="opacity-60" />
            </button>
            <div
              className="absolute top-full left-0 mt-1 py-1 w-52 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 surface-panel shadow-md"
              style={{ boxShadow: 'var(--shadow-md)' }}
            >
              {MORE_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-secondary)]',
                    pathname === href && 'text-nav-active'
                  )}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              ))}
              <div className="my-1 divider" />
              <Link
                href="/series"
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-secondary)]',
                  seriesActive && 'text-nav-active'
                )}
              >
                <BookMarked size={15} />
                <span>全部专题</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={openCommandSearch}
            className="btn btn-ghost p-2 hidden sm:flex items-center gap-1.5"
            title="搜索 (Ctrl+K)"
          >
            <Search size={16} />
            <kbd className="kbd-hint hidden lg:inline">⌃K</kbd>
          </button>
          <button
            type="button"
            onClick={openCommandSearch}
            className="btn btn-ghost p-2 sm:hidden"
            title="搜索"
          >
            <Search size={16} />
          </button>
          <ThemeSwitcher />

          <button
            type="button"
            className="md:hidden btn btn-ghost p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="打开菜单"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="btn btn-ghost text-sm justify-start"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            {MORE_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="btn btn-ghost text-sm justify-start"
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={15} className="mr-1" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
