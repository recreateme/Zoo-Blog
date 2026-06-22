'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'

interface EditorAttachToolbarProps {
  postId?: string
  onInsert: (markdown: string) => void
}

export default function EditorAttachToolbar({ postId, onInsert }: EditorAttachToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    setUploading(true)

    for (const file of Array.from(files)) {
      try {
        const form = new FormData()
        form.append('file', file)
        if (postId) form.append('postId', postId)

        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? '上传失败')
          continue
        }

        const url = data.attachment?.url as string | undefined
        if (!url) continue

        if (file.type.startsWith('image/')) {
          const alt = file.name.replace(/\.[^.]+$/, '')
          onInsert(`\n![${alt}](${url})\n`)
        } else {
          onInsert(`\n[${file.name}](${url})\n`)
        }
      } catch {
        setError('上传请求失败')
      }
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="btn btn-secondary text-xs w-full justify-center"
      >
        {uploading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <ImagePlus size={12} />
        )}
        {uploading ? '上传中…' : '插入图片/附件'}
      </button>
      {error && (
        <p className="text-[10px]" style={{ color: '#dc2626' }}>
          {error}
        </p>
      )}
    </div>
  )
}
