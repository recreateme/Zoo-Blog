'use client'

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: '#fef2f2' }}
        >
          <AlertTriangle size={28} style={{ color: '#dc2626' }} />
        </div>

        <h1
          className="text-2xl mb-3"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}
        >
          出错了
        </h1>

        <p className="mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          页面遇到了未预期的错误，请尝试刷新。
        </p>

        {error.digest && (
          <p className="text-xs mb-6 font-mono" style={{ color: 'var(--text-tertiary)' }}>
            错误 ID：{error.digest}
          </p>
        )}

        <button onClick={reset} className="btn btn-primary">
          <RefreshCw size={15} />
          重新加载
        </button>
      </div>
    </div>
  )
}
