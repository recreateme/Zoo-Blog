'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FileText, Loader2, Upload, Plus, X } from 'lucide-react'

const MAX_BATCH_IMPORT_FILES = 60

type SeriesOption = { id: string; name: string }
type BatchPreviewItem = {
  filename: string
  title: string
  slug: string
  slugConflict: boolean
  tags: string[]
  order: number
  warnings: string[]
}
type CommitResult = { filename: string; success: boolean; postId?: string; error?: string }

type BatchMeta = {
  targetSeries:
    | { mode: 'existing'; id: string }
    | { mode: 'new'; name: string; description?: string }
  defaultTags: string[]
  subdir?: string
  status: 'DRAFT' | 'PUBLISHED'
  orderStart?: number
  orderStep?: number
}

type EditableItem = BatchPreviewItem & { tagsText: string }

export default function BatchImportPanel({
  seriesList,
}: {
  seriesList: SeriesOption[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [seriesMode, setSeriesMode] = useState<'new' | 'existing'>('new')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [existingId, setExistingId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [subdir, setSubdir] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED')
  const [orderStart, setOrderStart] = useState('10')
  const [orderStep, setOrderStep] = useState('10')
  const [items, setItems] = useState<EditableItem[]>([])
  const [results, setResults] = useState<CommitResult[] | null>(null)
  const [committedSeriesId, setCommittedSeriesId] = useState('')
  const [busy, setBusy] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pushing, setPushing] = useState(false)
  const [pushMsg, setPushMsg] = useState('')

  const successCount = results?.filter((r) => r.success).length ?? 0
  const failCount = results?.filter((r) => !r.success).length ?? 0

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || tags.includes(t)) return
    setTags([...tags, t])
    setTagInput('')
  }

  const mergeFiles = (incoming: File[]) => {
    const md = incoming.filter((f) => f.name.toLowerCase().endsWith('.md'))
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]))
      for (const f of md) map.set(f.name, f)
      const next = Array.from(map.values())
      return next.slice(0, MAX_BATCH_IMPORT_FILES)
    })
    setItems([])
    setResults(null)
    setError('')
  }

  const buildMeta = (seriesOverride?: BatchMeta['targetSeries']): BatchMeta | string => {
    if (files.length < 1) return '请选择至少 1 个 .md 文件'
    if (files.length > MAX_BATCH_IMPORT_FILES) {
      return `单批最多 ${MAX_BATCH_IMPORT_FILES} 个文件，请分批导入`
    }
    if (tags.length === 0) return '至少需要 1 个默认标签'
    if (seriesMode === 'new' && !newName.trim()) return '请填写新专题名称'
    if (seriesMode === 'existing' && !existingId) return '请选择已有专题'

    const start = parseInt(orderStart, 10)
    const step = parseInt(orderStep, 10)
    return {
      targetSeries:
        seriesOverride ??
        (seriesMode === 'new'
          ? { mode: 'new', name: newName.trim(), description: newDescription.trim() || undefined }
          : { mode: 'existing', id: existingId }),
      defaultTags: tags,
      subdir: subdir.trim() || undefined,
      status,
      orderStart: Number.isFinite(start) ? start : 10,
      orderStep: Number.isFinite(step) ? step : 10,
    }
  }

  const commitMeta = useMemo<BatchMeta['targetSeries'] | null>(() => {
    if (committedSeriesId) return { mode: 'existing', id: committedSeriesId }
    return null
  }, [committedSeriesId])

  const handlePreview = async () => {
    setError('')
    const meta = buildMeta()
    if (typeof meta === 'string') {
      setError(meta)
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      for (const f of files) form.append('files', f)
      form.append('meta', JSON.stringify(meta))
      const res = await fetch('/api/posts/import-batch/preview', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `预览失败（HTTP ${res.status}）`)
        return
      }
      const next = (data.items as BatchPreviewItem[]).map((item) => ({
        ...item,
        tagsText: item.tags.join(', '),
      }))
      setItems(next)
      setResults(null)
    } catch {
      setError('网络错误')
    } finally {
      setBusy(false)
    }
  }

  const parsedItems = (): BatchCommitItemClient[] | string => {
    const out: BatchCommitItemClient[] = []
    for (const item of items) {
      const title = item.title.trim()
      const slug = item.slug.trim()
      const itemTags = item.tagsText
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
      if (!title) return `「${item.filename}」标题不能为空`
      if (!slug) return `「${item.filename}」slug 不能为空`
      if (itemTags.length === 0) return `「${item.filename}」至少需要 1 个标签`
      out.push({
        filename: item.filename,
        title,
        slug,
        tags: itemTags,
        order: Number.isFinite(item.order) ? item.order : 0,
      })
    }
    return out
  }

  const runCommit = async (payloadItems: BatchCommitItemClient[], payloadFiles: File[]) => {
    const meta = buildMeta(commitMeta ?? undefined)
    if (typeof meta === 'string') throw new Error(meta)
    const form = new FormData()
    for (const f of payloadFiles) form.append('files', f)
    form.append('items', JSON.stringify(payloadItems))
    form.append('meta', JSON.stringify(meta))
    const res = await fetch('/api/posts/import-batch/commit', { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || `导入失败（HTTP ${res.status}）`)
    }
    return data as { results: CommitResult[]; seriesId: string }
  }

  const handleCommit = async () => {
    setError('')
    const payload = parsedItems()
    if (typeof payload === 'string') {
      setError(payload)
      return
    }
    setBusy(true)
    try {
      const data = await runCommit(payload, files)
      setCommittedSeriesId(data.seriesId)
      setResults(data.results)
      setPushMsg('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setBusy(false)
    }
  }

  const handleRetry = async (filename: string) => {
    const file = files.find((f) => f.name === filename)
    if (!file) {
      setError(`找不到文件 ${filename}，请重新选择后重试`)
      return
    }
    setError('')
    setRetrying(filename)
    try {
      const meta = buildMeta(commitMeta ?? undefined)
      if (typeof meta === 'string') {
        setError(meta)
        return
      }
      const previewForm = new FormData()
      previewForm.append('files', file)
      previewForm.append('meta', JSON.stringify(meta))
      const previewRes = await fetch('/api/posts/import-batch/preview', {
        method: 'POST',
        body: previewForm,
      })
      const previewData = await previewRes.json().catch(() => ({}))
      if (!previewRes.ok) {
        setError(previewData.error || '重新解析失败')
        return
      }
      const item = (previewData.items as BatchPreviewItem[])[0]
      if (!item) {
        setError('重新解析未返回结果')
        return
      }
      const data = await runCommit(
        [
          {
            filename: item.filename,
            title: item.title,
            slug: item.slug,
            tags: item.tags,
            order: item.order,
          },
        ],
        [file]
      )
      setCommittedSeriesId(data.seriesId || committedSeriesId)
      setResults((prev) => {
        const next = [...(prev ?? [])]
        const row = data.results[0]
        const idx = next.findIndex((r) => r.filename === filename)
        if (idx >= 0) next[idx] = row
        else next.push(row)
        return next
      })
      setItems((prev) =>
        prev.map((row) =>
          row.filename === filename ? { ...item, tagsText: item.tags.join(', ') } : row
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '重试失败')
    } finally {
      setRetrying(null)
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
    <div className="space-y-5">
      <section>
        <span className="text-meta mb-1.5 block">Markdown 文件（最多 {MAX_BATCH_IMPORT_FILES} 个）</span>
        <div
          className="rounded-lg border border-dashed px-4 py-8 text-center transition-colors"
          style={{
            borderColor: dragOver ? 'var(--accent)' : 'var(--border)',
            background: dragOver ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--surface)',
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            mergeFiles(Array.from(e.dataTransfer.files))
          }}
        >
          <FileText size={22} className="mx-auto mb-2 opacity-70" />
          <p className="text-sm mb-3">把一组 .md 拖到这里，或点选文件</p>
          <button
            type="button"
            className="btn btn-secondary text-sm"
            onClick={() => inputRef.current?.click()}
          >
            选择文件
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".md,text/markdown"
            multiple
            className="hidden"
            onChange={(e) => {
              mergeFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>
        {files.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {files.map((f) => (
              <li key={f.name}>
                <button
                  type="button"
                  className="badge flex items-center gap-1"
                  onClick={() => {
                    setFiles(files.filter((x) => x.name !== f.name))
                    setItems([])
                    setResults(null)
                  }}
                  title="移出这一批"
                >
                  {f.name}
                  <X size={10} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted mt-2">已选 {files.length} 个文件，导入时按文件名自然排序赋专题顺序。</p>
      </section>

      <div>
        <span className="text-meta mb-1.5 block">目标专题</span>
        <div className="flex gap-2 mb-3" role="group" aria-label="专题方式">
          <button
            type="button"
            className={`btn ${seriesMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSeriesMode('new')}
            aria-pressed={seriesMode === 'new'}
          >
            新建专题
          </button>
          <button
            type="button"
            className={`btn ${seriesMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSeriesMode('existing')}
            aria-pressed={seriesMode === 'existing'}
          >
            归入已有专题
          </button>
        </div>
        {seriesMode === 'new' ? (
          <div className="space-y-2">
            <input
              className="input w-full"
              placeholder="专题名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="input w-full"
              placeholder="简介（可选）"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
        ) : (
          <select
            className="input w-full"
            value={existingId}
            onChange={(e) => setExistingId(e.target.value)}
          >
            <option value="">选择专题</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <span className="text-meta mb-1.5 block">默认标签（必填，会与文件自带标签合并）</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block sm:col-span-1">
          <span className="text-meta mb-1.5 block">目标子目录</span>
          <input
            className="input w-full"
            placeholder="例如 notes/网络工程师"
            value={subdir}
            onChange={(e) => setSubdir(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-meta mb-1.5 block">顺序起点</span>
          <input
            className="input w-full"
            type="number"
            value={orderStart}
            onChange={(e) => setOrderStart(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-meta mb-1.5 block">顺序步长</span>
          <input
            className="input w-full"
            type="number"
            value={orderStep}
            onChange={(e) => setOrderStep(e.target.value)}
          />
        </label>
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

      {error && (
        <p className="text-sm" style={{ color: 'var(--danger, #c44)' }}>
          {error}
        </p>
      )}

      <button type="button" className="btn btn-secondary" disabled={busy} onClick={handlePreview}>
        {busy && !results ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        {busy && items.length === 0 ? '解析中…' : '解析预览'}
      </button>

      {items.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-medium">预览确认（{items.length} 篇）</h2>
            <p className="text-xs text-muted">标题 / slug / 标签 / 顺序都可以改，确认后再写入。</p>
          </div>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-meta" style={{ background: 'var(--surface)' }}>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">文件</th>
                  <th className="px-3 py-2 font-medium">标题</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="px-3 py-2 font-medium">标签</th>
                  <th className="px-3 py-2 font-medium w-20">顺序</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={item.filename}
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      background: item.slugConflict
                        ? 'color-mix(in srgb, var(--danger, #c44) 8%, transparent)'
                        : undefined,
                    }}
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="text-xs break-all max-w-[10rem]">{item.filename}</div>
                      {item.warnings.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: 'var(--danger, #c44)' }}>
                          {item.warnings.join('；')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        className="input w-full min-w-[8rem]"
                        value={item.title}
                        onChange={(e) => {
                          const next = [...items]
                          next[idx] = { ...item, title: e.target.value }
                          setItems(next)
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        className="input w-full min-w-[8rem]"
                        value={item.slug}
                        onChange={(e) => {
                          const next = [...items]
                          next[idx] = { ...item, slug: e.target.value, slugConflict: false }
                          setItems(next)
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        className="input w-full min-w-[8rem]"
                        value={item.tagsText}
                        onChange={(e) => {
                          const next = [...items]
                          next[idx] = { ...item, tagsText: e.target.value }
                          setItems(next)
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        className="input w-20"
                        type="number"
                        value={item.order}
                        onChange={(e) => {
                          const next = [...items]
                          next[idx] = { ...item, order: parseInt(e.target.value, 10) || 0 }
                          setItems(next)
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !!results}
            onClick={handleCommit}
          >
            <Upload size={16} />
            {busy ? '导入中…' : `确认导入（${items.length} 篇）`}
          </button>
        </section>
      )}

      {results && (
        <section className="space-y-3 rounded border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--accent)' }}>
            完成：成功 {successCount} 篇
            {failCount > 0 ? `，失败 ${failCount} 篇` : ''}
          </p>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.filename} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="break-all">{r.filename}</span>
                  {r.success ? (
                    <span className="text-meta ml-2">→ {r.postId}</span>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--danger, #c44)' }}>
                      {r.error}
                    </p>
                  )}
                </div>
                {r.success ? (
                  <Check size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs shrink-0"
                    disabled={retrying === r.filename}
                    onClick={() => handleRetry(r.filename)}
                  >
                    {retrying === r.filename ? '重试中…' : '重新解析这一条'}
                  </button>
                )}
              </li>
            ))}
          </ul>
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
              onClick={() => router.push('/admin/posts')}
            >
              去笔记列表
            </button>
          </div>
          {pushMsg && (
            <p
              className="text-xs"
              style={{
                color:
                  pushMsg.includes('失败') || pushMsg.includes('无法')
                    ? 'var(--danger, #c44)'
                    : 'var(--accent)',
              }}
            >
              {pushMsg}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

type BatchCommitItemClient = {
  filename: string
  title: string
  slug: string
  tags: string[]
  order: number
}
