import Link from 'next/link'
import { Rss } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? '个人知识库'
  const author = process.env.NEXT_PUBLIC_SITE_AUTHOR ?? 'Author'

  return (
    <footer
      className="mt-20 border-t"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          © {year} {author} · {siteName}
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/rss.xml"
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--accent)]"
            style={{ color: 'var(--text-tertiary)' }}
            title="RSS 订阅"
          >
            <Rss size={14} />
            RSS
          </Link>
          <Link
            href="/sitemap.xml"
            className="text-sm transition-colors hover:text-[var(--accent)]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Sitemap
          </Link>
        </div>
      </div>
    </footer>
  )
}
