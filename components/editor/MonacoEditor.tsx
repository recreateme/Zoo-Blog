'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useRef } from 'react'
import { Loader2, Split, Eye, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

type ViewMode = 'editor' | 'preview' | 'split'

export default function MonacoEditor({ value, onChange, previewHtml, height = '100%' }: MonacoEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const editorRef = useRef<unknown>(null)

  const handleMount = useCallback((editor: unknown) => {
    editorRef.current = editor
  }, [])

  const modes: { id: ViewMode; icon: typeof Code2; label: string }[] = [
    { id: 'editor', icon: Code2, label: '编辑' },
    { id: 'split', icon: Split, label: '分栏' },
    { id: 'preview', icon: Eye, label: '预览' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b shrink-0"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>Markdown</span>
          <span className="mx-1.5">·</span>
          <span>{value.length} 字符</span>
        </div>

        {/* 视图切换 */}
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

      {/* 编辑/预览区 */}
      <div className="flex flex-1 min-h-0" style={{ height }}>
        {/* 编辑器 */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className={cn('flex-1 min-w-0', viewMode === 'split' && 'border-r')}
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <MonacoEditorLib
              language="markdown"
              value={value}
              onChange={(v) => onChange(v ?? '')}
              onMount={handleMount}
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
              theme="vs"
            />
          </div>
        )}

        {/* 预览 */}
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
              <div
                className="flex items-center justify-center h-full text-sm"
                style={{ color: 'var(--text-tertiary)' }}
              >
                预览将在保存后刷新
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
