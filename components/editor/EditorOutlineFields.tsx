'use client'

interface EditorOutlineFieldsProps {
  items: string[]
  onChange: (items: string[]) => void
}

export default function EditorOutlineFields({ items, onChange }: EditorOutlineFieldsProps) {
  const text = items.join('\n')

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        文首要点（每行一条）
      </label>
      <textarea
        value={text}
        onChange={(e) => {
          const next = e.target.value
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
          onChange(next)
        }}
        rows={4}
        className="input text-sm resize-y min-h-[5rem]"
        placeholder={'本文将介绍…\n第二个要点…'}
      />
      <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
        显示在文章页「本文要点」；同步自文件时以 frontmatter outline 为准
      </p>
    </div>
  )
}
