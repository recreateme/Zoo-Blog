'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Trash2, Copy, FileText, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { formatFileSize, cn } from '@/lib/utils'
import { copyTextToClipboard } from '@/lib/clipboard'
import EmptyState from '@/components/ui/EmptyState'
import type { Attachment } from '@/types'

type FileAttachment = Pick<Attachment, 'id' | 'originalName' | 'url' | 'type' | 'size' | 'createdAt'>

export default function FilesPage() {
  const [files, setFiles] = useState<FileAttachment[]>([])
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

  const copyUrl = async (url: string, id: string) => {
    const ok = await copyTextToClipboard(`${window.location.origin}${url}`)
    if (!ok) return
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === 'IMAGE') return <ImageIcon size={16} style={{ color: '#0284c7' }} aria-hidden />
    return <FileText size={16} style={{ color: 'var(--text-tertiary)' }} />
  }

  return (
    <div className="admin-page">
      <div className="flex items-center justify-between mb-6">
        <header>
          <h1 className="admin-page-title">附件管理</h1>
          <p className="admin-page-lead">共 {total} 个文件</p>
        </header>
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
        className={cn('admin-dropzone', dragOver && 'admin-dropzone-active')}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={24} className="mx-auto mb-2" style={{ color: dragOver ? 'var(--accent)' : 'var(--text-tertiary)' }} />
        <p className="text-sm text-lead" style={{ color: dragOver ? 'var(--accent)' : undefined }}>
          拖放文件到这里，或点击选择文件
        </p>
        <p className="text-xs text-meta mt-1">支持图片、PDF、Word，最大 10MB</p>
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
        <EmptyState
          compact
          title="暂无附件"
          description="上传图片、PDF 或 Word 文件，在编辑器中插入链接引用"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((file) => (
            <div key={file.id} className="admin-panel p-0 overflow-hidden group">
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
