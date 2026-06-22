'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Loader2, Split, Eye, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { editor as MonacoEditorType } from 'monaco-editor'

const MonacoEditorLib = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-sunken)' }}>
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
    </div>
  ),
})

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  previewHtml?: string
  height?: string
}

export interface MonacoEditorHandle {
  insertText: (text: string) => void
}

const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(function MonacoEditor(
  { value, onChange, previewHtml, height = '100%' },
  ref
) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const monacoTheme = mounted && resolvedTheme === 'dark' ? 'vs-dark' : 'vs'

  const insertText = useCallback((text: string) => {
    const editor = editorRef.current
    if (!editor) {
      onChange(value + text)
      return
    }
    const selection = editor.getSelection()
    const model = editor.getModel()
    if (!selection || !model) return
    editor.executeEdits('insert-attachment', [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ])
    editor.focus()
  }, [onChange, value])

  useImperativeHandle(ref, () => ({ insertText }), [insertText])

  const handleMount = useCallback((editor: MonacoEditorType.IStandaloneCodeEditor) => {
    editorRef.current = editor
  }, [])

  const modes: { id: ViewMode; icon: typeof Code2; label: string }[] = [
    { id: 'editor', icon: Code2, label: '编辑' },
    { id: 'split', icon: Split, label: '分栏' },
    { id: 'preview', icon: Eye, label: '预览' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="admin-editor-toolbar">
        <div className="flex items-center gap-1 text-xs text-meta">
          <span>Markdown</span>
          <span className="mx-1.5">·</span>
          <span>{value.length} 字符</span>
        </div>

        <div
          className="flex rounded-md overflow-hidden"
          style={{ border: '1px solid var(--border-default)' }}
        >
          {modes.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors',
                viewMode === id
                  ? 'font-medium'
                  : 'hover:bg-[var(--bg-surface)]'
              )}
              style={{
                background: viewMode === id ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                color: viewMode === id ? 'var(--accent)' : 'var(--text-secondary)',
                borderLeft: id !== 'editor' ? '1px solid var(--border-default)' : undefined,
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0" style={{ height }}>
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div
            className={cn('flex-1 min-w-0', viewMode === 'split' && 'border-r')}
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <MonacoEditorLib
              language="markdown"
              value={value}
              onChange={(v) => onChange(v ?? '')}
              onMount={handleMount}
              theme={monacoTheme}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.7,
                wordWrap: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'none',
                padding: { top: 16, bottom: 16 },
                folding: false,
                lineNumbers: 'off',
                glyphMargin: false,
                contextmenu: false,
                quickSuggestions: false,
                tabSize: 2,
              }}
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className="flex-1 min-w-0 overflow-auto"
            style={{ background: 'var(--bg-elevated)' }}
          >
            {previewHtml ? (
              <div
                className="markdown-body p-6 max-w-3xl"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-lead">
                预览将在保存后刷新
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default MonacoEditor

type ViewMode = 'editor' | 'preview' | 'split'
