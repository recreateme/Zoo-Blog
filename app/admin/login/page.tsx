'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2, Eye, EyeOff } from 'lucide-react'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'

export default function LoginPage() {
  const router = useRouter()
  const [callbackUrl, setCallbackUrl] = useState('/admin/dashboard')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('callbackUrl')
    if (next) setCallbackUrl(next)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    setLoading(false)
    if (res?.ok) {
      router.push(callbackUrl)
      router.refresh()
    } else {
      setError('邮箱或密码错误，请重试')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: 'color-mix(in srgb, var(--bg-base) 92%, transparent)' }}
    >
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <BookOpen size={22} style={{ color: 'var(--accent)' }} />
          <span
            className="text-xl"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}
          >
            {process.env.NEXT_PUBLIC_SITE_NAME ?? '知识库'}
          </span>
        </div>

        <h1
          className="text-lg font-medium text-center mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          管理员登录
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@example.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              密码
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="text-sm py-2 px-3 rounded-md"
              style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center mt-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
