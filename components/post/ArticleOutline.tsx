interface ArticleOutlineProps {
  items: string[]
}

export default function ArticleOutline({ items }: ArticleOutlineProps) {
  if (items.length === 0) return null

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{
        background: 'var(--accent-subtle)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-tertiary)' }}
      >
        本文要点
      </p>
      <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 leading-relaxed">
            <span
              className="shrink-0 font-medium tabular-nums"
              style={{ color: 'var(--accent)', minWidth: '1.25rem' }}
            >
              {i + 1}.
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
