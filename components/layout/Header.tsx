'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Menu, X, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/categories'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'

const NAV_LINKS = [
  { href: '/', label: '时间线' },
  { href: '/search', label: '搜索' },
]

export default function Header() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'color-mix(in srgb, var(--bg-elevated) 88%, transparent)',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold shrink-0"
          style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-primary)' }}
        >
          <BookOpen size={18} style={{ color: 'var(--accent)' }} />
          <span>{process.env.NEXT_PUBLIC_SITE_NAME ?? '知识库'}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'btn btn-ghost text-sm',
                pathname === href && 'font-medium'
              )}
              style={pathname === href ? { color: 'var(--accent)' } : {}}
            >
              {label}
            </Link>
          ))}

          {/* 分类下拉（hover） */}
          <div className="relative group">
            <button className="btn btn-ghost text-sm">
              分类
            </button>
            <div
              className="absolute top-full left-0 mt-1 py-1 w-56 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${cat.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-surface)] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            className="btn btn-ghost p-2 hidden sm:flex items-center gap-1.5"
            title="搜索 (Ctrl+K)"
          >
            <Search size={16} />
            <kbd
              className="text-[10px] px-1 py-0.5 rounded font-mono hidden lg:inline"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              ⌃K
            </kbd>
          </Link>
          <Link href="/search" className="btn btn-ghost p-2 sm:hidden" title="搜索">
            <Search size={16} />
          </Link>
          <ThemeSwitcher />

          {/* Mobile menu toggle */}
          <button
            className="md:hidden btn btn-ghost p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
        >
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
            <div className="my-1 divider" />
            <p className="text-xs px-2 mb-1" style={{ color: 'var(--text-tertiary)' }}>分类</p>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/${cat.id}`}
                className="btn btn-ghost text-sm justify-start"
                onClick={() => setMenuOpen(false)}
              >
                <span>{cat.icon}</span> {cat.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
