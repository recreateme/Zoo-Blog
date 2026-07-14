'use client'

import { useEffect, useRef } from 'react'
import { copyTextToClipboard } from '@/lib/clipboard'

interface MarkdownRendererProps {
  html: string
}

const COPY_LABEL = '复制'
const COPIED_LABEL = '已复制到剪切板'
const FAIL_LABEL = '复制失败'
const FEEDBACK_MS = 2200

export default function MarkdownRenderer({ html }: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const preBlocks = ref.current.querySelectorAll('pre')
    const timers: number[] = []

    preBlocks.forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return

      const wrapper = document.createElement('div')
      wrapper.className = 'code-block-wrapper'
      pre.parentNode?.insertBefore(wrapper, pre)
      wrapper.appendChild(pre)

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'copy-btn'
      btn.textContent = COPY_LABEL
      btn.setAttribute('aria-label', '复制代码')

      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? ''
        if (!code) return

        const ok = await copyTextToClipboard(code)
        if (ok) {
          btn.textContent = COPIED_LABEL
          btn.classList.add('copy-btn-copied')
          btn.classList.remove('copy-btn-failed')
          btn.setAttribute('aria-label', COPIED_LABEL)
          const t = window.setTimeout(() => {
            btn.textContent = COPY_LABEL
            btn.classList.remove('copy-btn-copied')
            btn.setAttribute('aria-label', '复制代码')
          }, FEEDBACK_MS)
          timers.push(t)
        } else {
          btn.textContent = FAIL_LABEL
          btn.classList.add('copy-btn-failed')
          btn.classList.remove('copy-btn-copied')
          const t = window.setTimeout(() => {
            btn.textContent = COPY_LABEL
            btn.classList.remove('copy-btn-failed')
          }, FEEDBACK_MS)
          timers.push(t)
        }
      })

      wrapper.appendChild(btn)
    })

    return () => {
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [html])

  return (
    <div
      ref={ref}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
