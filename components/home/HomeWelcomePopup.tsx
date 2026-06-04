'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { Heart, X } from 'lucide-react'

const STORAGE_KEY = 'kb-home-welcome-cute-v2'

export default function HomeWelcomePopup() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isHome) {
      setOpen(false)
      return
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return
    } catch {
      /* 隐私模式等：仍展示 */
    }
    const t = setTimeout(() => setOpen(true), 300)
    return () => clearTimeout(t)
  }, [isHome])

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  if (!isHome || !mounted || !open) return null

  return createPortal(
    <div
      className="home-welcome-cute-overlay fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9998 }}
      role="dialog"
      aria-labelledby="home-welcome-title"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0"
        style={{ background: 'rgba(255, 182, 193, 0.35)' }}
        onClick={dismiss}
        aria-label="关闭"
      />

      <div className="home-welcome-cute-card relative w-full max-w-sm pointer-events-auto">
        <span className="home-welcome-cute-float absolute -top-2 left-6 text-2xl" aria-hidden>
          ✨
        </span>
        <span
          className="home-welcome-cute-float absolute -top-1 right-10 text-xl"
          style={{ animationDelay: '0.4s' }}
          aria-hidden
        >
          💕
        </span>

        <div
          className="relative rounded-[2rem] px-8 py-10 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #fff 0%, #fff5f8 40%, #ffe8f0 100%)',
            border: '2px solid rgba(255, 143, 171, 0.45)',
            boxShadow:
              '0 20px 50px rgba(255, 105, 150, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full transition-transform hover:scale-110"
            style={{ background: 'rgba(255, 143, 171, 0.2)', color: '#e85d8a' }}
            aria-label="关闭"
          >
            <X size={18} />
          </button>

          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl home-welcome-cute-bounce"
            style={{
              background: 'linear-gradient(135deg, #ffb7c5 0%, #ff8fab 100%)',
              boxShadow: '0 8px 20px rgba(255, 105, 150, 0.35)',
            }}
            aria-hidden
          >
            👋
          </div>

          <h2
            id="home-welcome-title"
            className="text-3xl sm:text-4xl font-semibold mb-2 tracking-wide"
            style={{
              color: '#e85d8a',
              fontFamily: 'var(--font-serif)',
            }}
          >
            Hi 小倪子
          </h2>

          <p className="text-sm mb-6" style={{ color: '#b87a8f' }}>
            欢迎来到知识库呀～今天也要开开心心地学习！
          </p>

          <div className="flex justify-center gap-1 mb-6" aria-hidden>
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                size={14}
                fill="#ff8fab"
                style={{ color: '#ff8fab', opacity: 0.5 + i * 0.2 }}
                className="home-welcome-cute-heart"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="w-full py-3 px-6 text-sm font-medium rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #ff9ebb 0%, #ff7aa8 100%)',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(255, 105, 150, 0.4)',
            }}
          >
            好哒，开始逛～
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
