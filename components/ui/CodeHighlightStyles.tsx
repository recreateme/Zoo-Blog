'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const HLJS_LIGHT =
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
const HLJS_DARK =
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark-dimmed.min.css'

/** 按站点主题（非系统偏好）切换 highlight.js 样式 */
export default function CodeHighlightStyles() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return

    const href = resolvedTheme === 'dark' ? HLJS_DARK : HLJS_LIGHT
    let link = document.getElementById('hljs-theme') as HTMLLinkElement | null

    if (!link) {
      link = document.createElement('link')
      link.id = 'hljs-theme'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }

    if (link.href !== href) link.href = href
  }, [resolvedTheme, mounted])

  return null
}
