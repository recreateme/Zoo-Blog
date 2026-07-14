'use client'

import { Plus, X } from 'lucide-react'

export type SeriesMembershipField = {
  name: string
  order: number | null
}

interface EditorSeriesFieldsProps {
  memberships: SeriesMembershipField[]
  seriesSuggestions?: string[]
  onChange: (next: SeriesMembershipField[]) => void
  /** 封面 URL */
  coverImage?: string
  onCoverImageChange?: (v: string) => void
}

export default function EditorSeriesFields({
  memberships,
  seriesSuggestions = [],
  onChange,
  coverImage = '',
  onCoverImageChange,
}: EditorSeriesFieldsProps) {
  const listId = 'series-suggestions-multi'

  const add = (name: string, orderStr: string) => {
    const n = name.trim()
    if (!n || memberships.some((m) => m.name === n)) return
    const order = orderStr.trim() ? parseInt(orderStr, 10) : null
    onChange([
      ...memberships,
      { name: n, order: Number.isFinite(order as number) ? order : null },
    ])
  }

  return (
    <>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          专题（可多选）
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {memberships.map((m) => (
            <button
              key={m.name}
              type="button"
              className="badge flex items-center gap-1 text-xs"
              onClick={() => onChange(memberships.filter((x) => x.name !== m.name))}
            >
              {m.name}
              {m.order != null ? ` #${m.order}` : ''}
              <X size={10} />
            </button>
          ))}
        </div>
        <SeriesAddRow
          listId={listId}
          suggestions={seriesSuggestions}
          onAdd={add}
        />
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          一篇笔记可属于多个专题；顺序为专题内排序
        </p>
      </div>
      {onCoverImageChange && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            封面图 URL（可选）
          </label>
          <input
            type="text"
            value={coverImage}
            onChange={(e) => onCoverImageChange(e.target.value)}
            className="input text-sm"
            placeholder="/images/covers/xxx.webp"
          />
        </div>
      )}
    </>
  )
}

function SeriesAddRow({
  listId,
  suggestions,
  onAdd,
}: {
  listId: string
  suggestions: string[]
  onAdd: (name: string, order: string) => void
}) {
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onAdd(String(fd.get('name') ?? ''), String(fd.get('order') ?? ''))
        e.currentTarget.reset()
      }}
    >
      <input
        name="name"
        className="input text-sm flex-1 min-w-[8rem]"
        list={suggestions.length > 0 ? listId : undefined}
        placeholder="专题名"
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
      <input name="order" type="number" min={1} className="input text-sm w-20" placeholder="顺序" />
      <button type="submit" className="btn btn-secondary text-xs px-2">
        <Plus size={12} />
        添加
      </button>
    </form>
  )
}
