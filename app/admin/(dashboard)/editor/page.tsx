'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Sparkles, Loader2, Tag, RotateCcw } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import { generateSlug, calculateReadingTime } from '@/lib/utils'
import MonacoEditor from '@/components/editor/MonacoEditor'

const DEFAULT_CONTENT = `# 笔记标题

在这里开始写作...

## 概述

## 主要内容

## 总结
`

export default function NewEditorPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [category, setCategory] = useState('others')
  const [subcategory, setSubcategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [summary, setSummary] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState<'summary' | 'tags' | null>(null)
  const [error, setError] = useState('')

  // 根据标题自动生成 slug
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!slug) setSlug(generateSlug(val))
  }

  // AI 生成摘要
  const handleAiSummary = async () => {
    if (!content.trim() || !title.trim()) return
    setAiLoading('summary')
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      })
      const data = await res.json()
      if (data.summary) setSummary(data.summary)
      if (data.keywords?.length && tags.length === 0) setTags(data.keywords)
    } catch { /* ignore */ }
    setAiLoading(null)
  }

  // AI 生成标签
  const handleAiTags = async () => {
    if (!content.trim() || !title.trim()) return
    setAiLoading('tags')
    try {
      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, category }),
      })
      const data = await res.json()
      if (data.tags?.length) setTags(data.tags)
    } catch { /* ignore */ }
    setAiLoading(null)
  }

  // 添加标签
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  // 保存
  const handleSave = async () => {
    if (!title.trim()) { setError('请输入标题'); return }
    if (!slug.trim()) { setError('请输入 Slug'); return }

    setSaving(true)
    setError('')

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: slug,
        title,
        content,
        category,
        subcategory: subcategory || undefined,
        tags,
        status,
        summary: summary || undefined,
      }),
    })
    const data = await res.json()

    if (data.success) {
      router.push(`/admin/editor/${slug}`)
    } else {
      setError(data.error ?? '保存失败')
    }
    setSaving(false)
  }

  const readingTime = calculateReadingTime(content)

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部工具栏 */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b shrink-0"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          新建笔记
        </span>
        <div className="flex-1" />

        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          约 {readingTime} 分钟阅读
        </span>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
          className="input py-1.5 text-sm w-auto"
        >
          <option value="DRAFT">草稿</option>
          <option value="PUBLISHED">发布</option>
        </select>

        <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          保存
        </button>
      </div>

      {error && (
        <div className="px-5 py-2 text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* 左侧：元数据表单 */}
        <div
          className="w-64 shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div className="p-4 space-y-4">
            {/* 标题 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                标题 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="input text-sm"
                placeholder="笔记标题"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Slug (URL) *
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  className="input text-sm font-mono"
                  placeholder="url-slug"
                />
                <button
                  onClick={() => setSlug(generateSlug(title))}
                  className="btn btn-secondary p-2"
                  title="从标题重新生成"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                分类 *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 子分类 */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                子分类
              </label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="input text-sm"
                placeholder="可选"
              />
            </div>

            {/* 摘要 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  摘要
                </label>
                <button
                  onClick={handleAiSummary}
                  disabled={!!aiLoading}
                  className="flex items-center gap-1 text-xs hover:text-[var(--accent)] transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="AI 生成摘要"
                >
                  {aiLoading === 'summary' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  AI 生成
                </button>
              </div>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="input text-sm resize-none"
                rows={4}
                placeholder="文章摘要（留空可 AI 生成）"
              />
            </div>

            {/* 标签 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  标签
                </label>
                <button
                  onClick={handleAiTags}
                  disabled={!!aiLoading}
                  className="flex items-center gap-1 text-xs hover:text-[var(--accent)] transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="AI 生成标签"
                >
                  {aiLoading === 'tags' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  AI 生成
                </button>
              </div>

              <div className="flex gap-1 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  className="input text-sm flex-1"
                  placeholder="输入后按 Enter"
                />
                <button onClick={addTag} className="btn btn-secondary p-2">
                  <Tag size={13} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="badge text-xs hover:opacity-70 transition-opacity"
                    style={{
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      cursor: 'pointer',
                    }}
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：编辑器 */}
        <div className="flex-1 min-w-0">
          <MonacoEditor
            value={content}
            onChange={setContent}
          />
        </div>
      </div>
    </div>
  )
}
