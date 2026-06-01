'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, FileText, PenSquare, Paperclip,
  Settings, LogOut, BookOpen, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/admin/posts', label: '笔记管理', icon: FileText },
  { href: '/admin/editor', label: '新建笔记', icon: PenSquare },
  { href: '/admin/files', label: '附件管理', icon: Paperclip },
  { href: '/admin/settings', label: '设置', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 shrink-0 flex flex-col min-h-screen"
      style={{
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <BookOpen size={18} style={{ color: 'var(--accent)' }} />
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            管理后台
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'font-medium'
                  : 'hover:bg-[var(--bg-surface)]'
              )}
              style={{
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-subtle)' : undefined,
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t space-y-0.5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>页面风格</span>
          <ThemeSwitcher />
        </div>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-surface)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ExternalLink size={16} />
          查看博客
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-surface)]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <LogOut size={16} />
          退出登录
        </button>
      </div>
    </aside>
  )
}
