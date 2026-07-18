'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Plus, X } from 'lucide-react'

type SeriesRow = { name: string; order: number | null }

export default function AdminUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [seriesRows, setSeriesRows] = useState<SeriesRow[]>([])
  const [seriesName, setSeriesName] = useState('')
  const [seriesOrder, setSeriesOrder] = useState('')
  const [seriesSuggestions, setSeriesSuggestions] = useState<string[]>([])
  const [subdir, setSubdir] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    fetch('/api/posts?seriesOptions=1')
      .then((r) => r.json())
      .then((d) => setSeriesSuggestions(d.series ?? []))
      .catch(() => {})
  }, [])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || tags.includes(t)) return
    setTags([...tags, t])
    setTagInput('')
  }

  const addSeries = () => {
    const name = seriesName.trim()
    if (!name || seriesRows.some((s) => s.name === name)) return
    const order = seriesOrder.trim() ? parseInt(seriesOrder, 10) : null
    setSeriesRows([...seriesRows, { name, order: Number.isFinite(order) ? order : null }])
    setSeriesName('')
    setSeriesOrder('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (!file) {
      setError('请选择 .md 文件')
      return
    }
    if (tags.length === 0) {
      setError('至少需要 1 个标签')
      return
    }

    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append(
        'meta',
        JSON.stringify({
          slug: slug || undefined,
          title: title || undefined,
          tags,
          status,
          subdir: subdir || undefined,
          coverImage: coverImage || null,
          series: seriesRows,
        })
      )
      const res = await fetch('/api/posts/import', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = Array.isArray(data.details)
          ? `：${data.details.map((d: { message?: string }) => d.message).filter(Boolean).join('；')}`
          : ''
        setError(`${data.error || `导入失败（HTTP ${res.status}）`}${detail}`)
        return
      }
      setOk(`已写入 ${data.post.filePath}`)
      setTimeout(() => router.push(data.editUrl || `/admin/editor/${data.post.id}`), 600)
    } catch {
      setError('网络错误')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-display text-2xl mb-1">上传笔记</h1>
        <p className="text-lead text-sm">
          选择本地 Markdown，写入 <code className="text-xs">content/</code> 并入库
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="text-meta mb-1.5 block">Markdown 文件</span>
          <input
            type="file"
            accept=".md,text/markdown"
            className="input w-full"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-meta mb-1.5 block">标题（可选，覆盖 frontmatter）</span>
            <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-meta mb-1.5 block">Slug（可选）</span>
            <input className="input w-full" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className="text-meta mb-1.5 block">目标子目录（相对 content/）</span>
          <input
            className="input w-full"
            placeholder="例如 notes/cv"
            value={subdir}
            onChange={(e) => setSubdir(e.target.value)}
          />
        </label>

        <div>
          <span className="text-meta mb-1.5 block">标签（必填）</span>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className="badge badge-tag flex items-center gap-1"
                onClick={() => setTags(tags.filter((x) => x !== t))}
              >
                {t}
                <X size={10} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="输入后回车添加"
            />
            <button type="button" className="btn btn-secondary" onClick={addTag}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div>
          <span className="text-meta mb-1.5 block">专题（可选，可多选）</span>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {seriesRows.map((s) => (
              <button
                key={s.name}
                type="button"
                className="badge flex items-center gap-1"
                onClick={() => setSeriesRows(seriesRows.filter((x) => x.name !== s.name))}
              >
                {s.name}
                {s.order != null ? ` #${s.order}` : ''}
                <X size={10} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[8rem]"
              list="series-suggestions"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              placeholder="专题名"
            />
            <datalist id="series-suggestions">
              {seriesSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <input
              className="input w-24"
              type="number"
              value={seriesOrder}
              onChange={(e) => setSeriesOrder(e.target.value)}
              placeholder="顺序"
            />
            <button type="button" className="btn btn-secondary" onClick={addSeries}>
              添加
            </button>
          </div>
        </div>

        <label className="block">
          <span className="text-meta mb-1.5 block">封面 URL（可选）</span>
          <input
            className="input w-full"
            placeholder="/images/covers/xxx.webp"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-meta mb-1.5 block">状态</span>
          <select
            className="input w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
          >
            <option value="PUBLISHED">发布</option>
            <option value="DRAFT">草稿</option>
          </select>
        </label>

        {error && <p className="text-sm" style={{ color: 'var(--danger, #c44)' }}>{error}</p>}
        {ok && <p className="text-sm" style={{ color: 'var(--accent)' }}>{ok}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Upload size={16} />
          {busy ? '导入中…' : '写入 content/ 并入库'}
        </button>
      </form>
    </div>
  )
}
