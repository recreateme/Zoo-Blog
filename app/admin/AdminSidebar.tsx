'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, FileText, PenSquare, Paperclip,
  Settings, LogOut, ScrollText, ExternalLink,
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
  const { data: session } = useSession()
  const isAdmin = session?.user?.role !== 'EDITOR'
  const navItems = NAV_ITEMS.filter((item) => isAdmin || item.href !== '/admin/settings')

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <div className="flex items-center gap-2">
          <ScrollText size={18} style={{ color: 'var(--accent)' }} />
          管理后台
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== '/admin/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn('admin-nav-link', active && 'admin-nav-link-active')}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t space-y-0.5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-meta">页面风格</span>
          <ThemeSwitcher />
        </div>
        <Link href="/" target="_blank" className="admin-nav-link">
          <ExternalLink size={16} />
          查看博客
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="admin-nav-link w-full"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <LogOut size={16} />
          退出登录
        </button>
      </div>
    </aside>
  )
}
