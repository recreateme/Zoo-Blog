'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Palette, Check } from 'lucide-react'
import { SITE_THEMES, isSiteThemeId, type SiteThemeId } from '@/lib/themes'

function normalizeTheme(value: string | undefined): SiteThemeId {
  if (value && isSiteThemeId(value)) return value
  if (value === 'light') return 'classic'
  return 'classic'
}

export default function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const normalized = normalizeTheme(resolvedTheme)
    if (resolvedTheme !== normalized) setTheme(normalized)
  }, [mounted, resolvedTheme, setTheme])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (!mounted) return <div className="w-8 h-8" />

  const current = normalizeTheme(resolvedTheme)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn btn-ghost p-2"
        title="切换页面风格"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Palette size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 w-52 rounded-lg z-[60]"
          role="listbox"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <p
            className="px-3 py-2 text-xs font-medium"
            style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
          >
            页面风格
          </p>
          {SITE_THEMES.map(({ id, label, description }) => {
            const active = current === id
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setTheme(id as SiteThemeId)
                  setOpen(false)
                }}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-[var(--bg-surface)] transition-colors"
              >
                <span
                  className="mt-0.5 w-3 h-3 rounded-sm shrink-0 border"
                  style={{
                    background: `var(--theme-swatch-${id}, var(--accent-subtle))`,
                    borderColor: active ? 'var(--accent)' : 'var(--border-default)',
                  }}
                />
                <span className="flex-1 min-w-0">
                  <span
                    className="flex items-center gap-1 text-sm font-medium"
                    style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}
                  >
                    {label}
                    {active && <Check size={13} />}
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
