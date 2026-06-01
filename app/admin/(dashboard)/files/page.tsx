'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Trash2, Copy, FileText, Image, Loader2, X } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface Attachment {
  id: string
  originalName: string
  url: string
  type: 'IMAGE' | 'PDF' | 'WORD' | 'OTHER'
  size: number
  createdAt: string
}

export default function FilesPage() {
  const [files, setFiles] = useState<Attachment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    const res = await fetch(`/api/upload?${params}`)
    const data = await res.json()
    setFiles(data.attachments ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [typeFilter])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)

    for (const file of Array.from(fileList)) {
      const formData = new FormData()
      formData.append('file', file)
      await fetch('/api/upload', { method: 'POST', body: formData })
    }

    setUploading(false)
    fetchFiles()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除 "${name}"？`)) return
    setDeleting(id)
    await fetch(`/api/upload?id=${id}`, { method: 'DELETE' })
    setDeleting(null)
    fetchFiles()
  }

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${url}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === 'IMAGE') return <Image size={16} style={{ color: '#0284c7' }} />
    return <FileText size={16} style={{ color: 'var(--text-tertiary)' }} />
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}>
            附件管理
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>共 {total} 个文件</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-primary"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          上传文件
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* 拖拽上传区 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files) }}
        className="border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors cursor-pointer"
        style={{
          borderColor: dragOver ? 'var(--accent)' : 'var(--border-default)',
          background: dragOver ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={24} className="mx-auto mb-2" style={{ color: dragOver ? 'var(--accent)' : 'var(--text-tertiary)' }} />
        <p className="text-sm" style={{ color: dragOver ? 'var(--accent)' : 'var(--text-secondary)' }}>
          拖放文件到这里，或点击选择文件
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          支持图片、PDF、Word，最大 10MB
        </p>
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-2 mb-4">
        {['', 'IMAGE', 'PDF', 'WORD', 'OTHER'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className="badge cursor-pointer transition-colors"
            style={{
              background: typeFilter === t ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              color: typeFilter === t ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${typeFilter === t ? 'var(--accent)' : 'var(--border-subtle)'}`,
            }}
          >
            {t || '全部'}
          </button>
        ))}
      </div>

      {/* 文件网格 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-3xl mb-2">📎</p>
          <p style={{ color: 'var(--text-secondary)' }}>还没有上传任何文件</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              {/* 预览区 */}
              <div className="h-32 flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
                {file.type === 'IMAGE' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt={file.originalName} className="h-full w-full object-cover" />
                ) : (
                  <TypeIcon type={file.type} />
                )}
              </div>

              {/* 文件信息 */}
              <div className="p-2.5">
                <p className="text-xs truncate font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  {file.originalName}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {formatFileSize(file.size)}
                </p>

                {/* 操作按钮 */}
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => copyUrl(file.url, file.id)}
                    className="btn btn-secondary flex-1 py-1 text-xs justify-center"
                    title="复制链接"
                  >
                    {copied === file.id ? '✓ 已复制' : <><Copy size={11} /> 复制链接</>}
                  </button>
                  <button
                    onClick={() => handleDelete(file.id, file.originalName)}
                    disabled={deleting === file.id}
                    className="btn btn-ghost p-1.5"
                    style={{ color: '#dc2626' }}
                  >
                    {deleting === file.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
