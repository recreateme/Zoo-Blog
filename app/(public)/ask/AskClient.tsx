'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MessageCircle, Send, Loader2, BookOpen, AlertCircle } from 'lucide-react'
import { getCategoryName } from '@/lib/categories'
import { cn } from '@/lib/utils'
import type { AskResponse } from '@/types'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: AskResponse['sources']
}

export default function AskClient() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const nextIdRef = useRef(0)

  const appendMessage = (msg: Omit<Message, 'id'>) => {
    const id = nextIdRef.current++
    setMessages((prev) => [...prev, { ...msg, id }])
    return id
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return

    setError('')
    setQuestion('')
    const userMsgId = appendMessage({ role: 'user', content: q })
    setLoading(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()

      if (res.status === 401) {
        setNeedsLogin(true)
        setError(data.error ?? '请先登录后使用问答功能')
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId))
        return
      }

      if (res.status === 503) {
        setDisabled(true)
        setError(data.error ?? 'RAG 服务未启用')
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId))
        return
      }

      if (!res.ok) {
        setError(data.error ?? '请求失败')
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId))
        return
      }

      const result = data as AskResponse
      appendMessage({
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
      })
    } catch {
      setError('网络错误，请稍后重试')
      setMessages((prev) => prev.filter((m) => m.id !== userMsgId))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ask-page">
      <header className="mb-8">
        <h1 className="text-display text-2xl mb-2 flex items-center gap-2">
          <MessageCircle size={24} style={{ color: 'var(--accent)' }} />
          知识问答
        </h1>
        <p className="text-lead text-sm">
          基于你的笔记库进行语义检索，由 AI 综合回答并标注参考来源。
        </p>
      </header>

      {needsLogin && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6 text-sm surface-panel"
          style={{ color: 'var(--text-secondary)' }}
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              需要登录
            </p>
            <p>
              问答功能默认仅对已登录用户开放。请前往{' '}
              <Link href="/admin/login" className="underline" style={{ color: 'var(--accent)' }}>
                后台登录
              </Link>
              ，或在 .env 中设置 <code>ASK_PUBLIC=true</code> 允许公开访问。
            </p>
          </div>
        </div>
      )}

      {disabled && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-6 text-sm surface-panel"
          style={{ color: 'var(--text-secondary)' }}
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              RAG 未配置
            </p>
            <p>
              请启动 Qdrant（<code>docker compose --profile rag up -d</code>），并配置{' '}
              <code>QDRANT_URL</code> 与 Embedding API 后执行向量重建。
            </p>
          </div>
        </div>
      )}

      <div className="ask-thread">
        {messages.length === 0 && !loading && (
          <div className="ask-empty">
            <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
            <p>例如：「OSPF 区域类型有哪些区别？」</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'ask-bubble',
                msg.role === 'user' ? 'ask-bubble-user' : 'ask-bubble-assistant'
              )}
            >
              <p
                className={cn(
                  'ask-answer-text',
                  msg.role === 'assistant' && 'text-display text-[0.9375rem] leading-relaxed'
                )}
              >
                {msg.content}
              </p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="ask-footnotes">
                  <p className="ask-footnotes-label">参考笔记</p>
                  <div className="ask-footnote-list">
                    {msg.sources.map((s) => (
                      <Link
                        key={s.postId}
                        href={`/post/${s.postId}`}
                        className={cn('ask-footnote-card', `badge-cat-${s.category}`)}
                      >
                        <p className="ask-footnote-title">{s.title}</p>
                        <p className="ask-footnote-meta">{getCategoryName(s.category)}</p>
                        {s.excerpt && (
                          <p className="ask-footnote-excerpt">{s.excerpt}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="ask-bubble ask-bubble-assistant flex items-center gap-2 text-lead">
              <Loader2 size={16} className="animate-spin shrink-0" />
              检索笔记并生成回答…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-sm mb-3" style={{ color: 'var(--danger, #e53e3e)' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="ask-input-wrap">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入你的问题…"
          disabled={loading || disabled}
          maxLength={500}
          className="ask-input"
        />
        <button
          type="submit"
          disabled={loading || disabled || !question.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-opacity disabled:opacity-40"
          style={{ color: 'var(--accent)' }}
          aria-label="发送"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
