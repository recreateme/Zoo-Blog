'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ImagePlus, Link2, Upload, Plus, X } from 'lucide-react'

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
  const [coverMode, setCoverMode] = useState<'local' | 'remote'>('local')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverUrl, setCoverUrl] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [pushing, setPushing] = useState(false)
  const [pushMsg, setPushMsg] = useState('')

  useEffect(() => {
    fetch('/api/posts?seriesOptions=1')
      .then((r) => r.json())
      .then((d) => setSeriesSuggestions(d.series ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (coverMode === 'local' && coverFile) {
      const objectUrl = URL.createObjectURL(coverFile)
      setCoverPreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setCoverPreview(
      coverMode === 'remote' && /^https?:\/\//i.test(coverUrl.trim())
        ? coverUrl.trim()
        : ''
    )
  }, [coverFile, coverMode, coverUrl])

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
    if (coverMode === 'local' && coverFile && coverFile.size > 8 * 1024 * 1024) {
      setError('封面图片不能超过 8MB')
      return
    }
    if (coverMode === 'remote' && coverUrl.trim()) {
      try {
        const url = new URL(coverUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol')
      } catch {
        setError('请输入完整的 http:// 或 https:// 公网图片地址')
        return
      }
    }

    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      if (coverMode === 'local' && coverFile) {
        form.append('coverFile', coverFile)
      }
      form.append(
        'meta',
        JSON.stringify({
          slug: slug || undefined,
          title: title || undefined,
          tags,
          status,
          subdir: subdir || undefined,
          coverImage: coverMode === 'remote' ? coverUrl.trim() || null : null,
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
      setEditUrl(data.editUrl || `/admin/editor/${data.post.id}`)
      setPushMsg('')
    } catch {
      setError('网络错误')
    } finally {
      setBusy(false)
    }
  }

  const handlePushGithub = async () => {
    if (!window.confirm('将 content/ 与 public/images/ 推送到 GitHub。继续？')) return
    setPushing(true)
    setPushMsg('')
    try {
      const res = await fetch('/api/admin/git-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setPushMsg(data.result?.message ?? data.error ?? '推送失败')
        return
      }
      setPushMsg(data.result?.message ?? '已推送到 GitHub')
    } catch {
      setPushMsg('推送请求失败')
    } finally {
      setPushing(false)
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

        <div>
          <div className="mb-2">
            <span className="text-meta block">封面图片（可选）</span>
            <span className="text-xs text-muted">
              图片会转为 WebP 并随文章保存到项目中；导入失败时自动清理
            </span>
          </div>
          <div className="flex gap-2 mb-3" role="group" aria-label="封面来源">
            <button
              type="button"
              className={`btn ${coverMode === 'local' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setCoverMode('local')
                setCoverUrl('')
              }}
              aria-pressed={coverMode === 'local'}
            >
              <ImagePlus size={14} />
              本地图片
            </button>
            <button
              type="button"
              className={`btn ${coverMode === 'remote' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setCoverMode('remote')
                setCoverFile(null)
              }}
              aria-pressed={coverMode === 'remote'}
            >
              <Link2 size={14} />
              公网图片
            </button>
          </div>

          {coverMode === 'local' ? (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="input w-full"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          ) : (
            <input
              type="url"
              className="input w-full"
              placeholder="https://example.com/cover.jpg"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          )}

          {coverPreview && (
            <div className="relative mt-3 aspect-[16/9] w-full max-w-md overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <Image
                src={coverPreview}
                alt="封面预览"
                fill
                unoptimized
                className="object-cover"
                onError={() => setCoverPreview('')}
              />
            </div>
          )}
        </div>

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
        {ok && (
          <div className="space-y-3 rounded border border-[var(--border)] p-3">
            <p className="text-sm" style={{ color: 'var(--accent)' }}>{ok}</p>
            <p className="text-xs text-meta">
              站点已可访问；若要同步到 GitHub 仓库，请点下方推送（或稍后在「设置 → 发布」）。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary text-sm"
                disabled={pushing}
                onClick={handlePushGithub}
              >
                {pushing ? '推送中…' : '推送到 GitHub'}
              </button>
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => router.push(editUrl || '/admin/posts')}
              >
                去编辑
              </button>
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => router.push('/admin/settings#publish')}
              >
                打开设置
              </button>
            </div>
            {pushMsg && (
              <p
                className="text-xs"
                style={{
                  color: pushMsg.includes('失败') || pushMsg.includes('无法')
                    ? 'var(--danger, #c44)'
                    : 'var(--accent)',
                }}
              >
                {pushMsg}
              </p>
            )}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={busy || !!ok}>
          <Upload size={16} />
          {busy ? '导入中…' : '写入 content/ 并入库'}
        </button>
      </form>
    </div>
  )
}
