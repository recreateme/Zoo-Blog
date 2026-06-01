import Link from 'next/link'
import { ArrowLeft, FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--accent-subtle)' }}
        >
          <FileQuestion size={28} style={{ color: 'var(--accent)' }} />
        </div>

        <h1
          className="text-6xl mb-4"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
          }}
        >
          404
        </h1>

        <h2
          className="text-xl mb-3"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}
        >
          页面不存在
        </h2>

        <p className="mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          你访问的页面可能已被删除、移动，或者从未存在过。
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            <ArrowLeft size={15} />
            返回首页
          </Link>
          <Link href="/search" className="btn btn-secondary">
            搜索笔记
          </Link>
        </div>
      </div>
    </div>
  )
}
