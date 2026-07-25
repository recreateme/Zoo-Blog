'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Save, Sparkles, Loader2, Tag, ExternalLink, ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { computePostStats, formatWordCount } from '@/lib/utils'
import MonacoEditor, { type MonacoEditorHandle } from '@/components/editor/MonacoEditor'
import EditorAttachToolbar from '@/components/editor/EditorAttachToolbar'
import EditorSeriesFields, {
  type SeriesMembershipField,
} from '@/components/editor/EditorSeriesFields'
import EditorOutlineFields from '@/components/editor/EditorOutlineFields'

export default function EditEditorPage() {
  const params = useParams()
  const rawSlug = String(params.slug ?? '')
  const slug = (() => {
    try {
      return decodeURIComponent(rawSlug)
    } catch {
      return rawSlug
    }
  })()
  const slugPath = encodeURIComponent(slug)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [memberships, setMemberships] = useState<SeriesMembershipField[]>([])
  const [coverImage, setCoverImage] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [summary, setSummary] = useState('')
  const [outline, setOutline] = useState<string[]>([])
  const [seriesSuggestions, setSeriesSuggestions] = useState<string[]>([])
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState<'summary' | 'tags' | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const editorRef = useRef<MonacoEditorHandle>(null)

  // 加载已有文章
  useEffect(() => {
    fetch(`/api/posts/${slugPath}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.post
        setTitle(p.title)
        setContent(p.content)
        setSubcategory(p.subcategory ?? '')
        setCoverImage(p.coverImage ?? '')
        if (Array.isArray(p.seriesMemberships) && p.seriesMemberships.length > 0) {
          setMemberships(
            p.seriesMemberships.map((m: { name: string; order: number | null }) => ({
              name: m.name,
              order: m.order,
            }))
          )
        } else if (p.series?.trim()) {
          setMemberships([
            {
              name: p.series.trim(),
              order: p.seriesOrder ?? null,
            },
          ])
        } else {
          setMemberships([])
        }
        setTags(Array.isArray(p.tags) ? p.tags : [])
        setSummary(p.summary ?? '')
        try {
          const ol = typeof p.outline === 'string' ? JSON.parse(p.outline) : p.outline
          setOutline(Array.isArray(ol) ? ol.filter((x: unknown) => typeof x === 'string') : [])
        } catch {
          setOutline([])
        }
        setStatus(p.status)
        setLoading(false)
      })
      .catch(() => { setError('加载文章失败'); setLoading(false) })
  }, [slugPath])

  useEffect(() => {
    fetch('/api/posts?seriesOptions=1')
      .then((r) => r.json())
      .then((data) => setSeriesSuggestions(data.series ?? []))
      .catch(() => setSeriesSuggestions([]))
  }, [])

  // 实时生成预览 HTML（500ms 防抖）
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!content) return
      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        const data = await res.json()
        if (data.html) setPreviewHtml(data.html)
      } catch { /* ignore */ }
    }, 500)
    return () => clearTimeout(timer)
  }, [content])

  const handleAiSummary = async () => {
    setAiLoading('summary')
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      })
      const data = await res.json()
      if (data.summary) setSummary(data.summary)
    } catch { /* ignore */ }
    setAiLoading(null)
  }

  const handleAiTags = async () => {
    setAiLoading('tags')
    try {
      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      })
      const data = await res.json()
      if (data.tags?.length) setTags(data.tags)
    } catch { /* ignore */ }
    setAiLoading(null)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const handleSave = useCallback(async () => {
    if (tags.length === 0) {
      setError('至少需要 1 个标签')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/posts/${slugPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        subcategory: subcategory || null,
        seriesMemberships: memberships,
        coverImage: coverImage.trim() || null,
        tags,
        status,
        summary: summary || null,
        outline,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError(data.error ?? '保存失败')
    }
    setSaving(false)
  }, [slug, title, content, subcategory, memberships, coverImage, tags, status, summary, outline])

  // Ctrl+S 快捷保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    )
  }

  const { readingTime, wordCount } = computePostStats(content)

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部栏 */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b shrink-0"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
      >
        <Link href="/admin/posts" className="btn btn-ghost p-1.5">
          <ArrowLeft size={16} />
        </Link>

        <span className="text-sm truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          {title || slug}
        </span>

        <div className="flex-1" />

        {saved && (
          <span className="text-xs" style={{ color: '#16a34a' }}>✓ 已保存</span>
        )}

        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {formatWordCount(wordCount) && `${formatWordCount(wordCount)} · `}
          约 {readingTime} 分钟
        </span>

        <Link href={`/post/${slug}`} target="_blank" className="btn btn-ghost p-2" title="在新标签页预览">
          <ExternalLink size={14} />
        </Link>

        <a
          href={`/api/posts/${slugPath}/export`}
          className="btn btn-ghost p-2"
          title="下载完整 zip（含图片）"
        >
          <Download size={14} />
        </a>

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
        {/* 左侧：元数据 */}
        <div
          className="w-64 shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>标题</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>章节名（可选）</label>
              <input type="text" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="input text-sm" placeholder="专题内章节" />
            </div>

            <EditorSeriesFields
              memberships={memberships}
              seriesSuggestions={seriesSuggestions}
              onChange={setMemberships}
              coverImage={coverImage}
              onCoverImageChange={setCoverImage}
            />

            <EditorOutlineFields items={outline} onChange={setOutline} />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>摘要</label>
                <button onClick={handleAiSummary} disabled={!!aiLoading} className="flex items-center gap-1 text-xs hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  {aiLoading === 'summary' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  AI
                </button>
              </div>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="input text-sm resize-none" rows={4} placeholder="文章摘要" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>标签（必填）</label>
                <button onClick={handleAiTags} disabled={!!aiLoading} className="flex items-center gap-1 text-xs hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  {aiLoading === 'tags' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  AI
                </button>
              </div>
              <div className="flex gap-1 mb-2">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} className="input text-sm flex-1" placeholder="Enter 添加" />
                <button onClick={addTag} className="btn btn-secondary p-2"><Tag size={13} /></button>
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button key={tag} onClick={() => setTags(tags.filter((t) => t !== tag))} className="badge text-xs cursor-pointer hover:opacity-70" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {tag} ×
                  </button>
                ))}
              </div>
            </div>

            <EditorAttachToolbar
              postId={slug}
              onInsert={(md) => editorRef.current?.insertText(md)}
            />
          </div>
        </div>

        {/* 右侧：编辑器 */}
        <div className="flex-1 min-w-0">
          <MonacoEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            previewHtml={previewHtml}
          />
        </div>
      </div>
    </div>
  )
}
