import Link from 'next/link'
import { Rss, MessageCircle, Network } from 'lucide-react'
import { getSiteName } from '@/lib/site'

export default function Footer() {
  const year = new Date().getFullYear()
  const siteName = getSiteName()
  const author = process.env.NEXT_PUBLIC_SITE_AUTHOR ?? 'Author'

  return (
    <footer className="mt-20 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-meta">
          © {year} {author} · {siteName}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/ask"
            className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
          >
            <MessageCircle size={14} />
            问答
          </Link>
          <Link
            href="/graph"
            className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
          >
            <Network size={14} />
            图谱
          </Link>
          <Link
            href="/rss.xml"
            className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
            title="RSS 订阅"
          >
            <Rss size={14} />
            RSS
          </Link>
          <Link
            href="/sitemap.xml"
            className="text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent)]"
          >
            Sitemap
          </Link>
        </div>
      </div>
    </footer>
  )
}
