'use client'

import { useEffect, useRef } from 'react'

interface MarkdownRendererProps {
  html: string
}

export default function MarkdownRenderer({ html }: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    // 为每个 pre 块添加复制按钮
    const preBlocks = ref.current.querySelectorAll('pre')
    preBlocks.forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return

      const wrapper = document.createElement('div')
      wrapper.className = 'code-block-wrapper'
      pre.parentNode?.insertBefore(wrapper, pre)
      wrapper.appendChild(pre)

      const btn = document.createElement('button')
      btn.className = 'copy-btn'
      btn.textContent = '复制'
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent ?? ''
        await navigator.clipboard.writeText(code)
        btn.textContent = '已复制！'
        setTimeout(() => { btn.textContent = '复制' }, 2000)
      })
      wrapper.appendChild(btn)
    })
  }, [html])

  return (
    <div
      ref={ref}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
