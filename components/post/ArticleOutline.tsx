interface ArticleOutlineProps {
  items: string[]
}

export default function ArticleOutline({ items }: ArticleOutlineProps) {
  if (items.length === 0) return null

  return (
    <div className="post-outline">
      <p className="post-outline-label">本文要点</p>
      <ul className="post-outline-list">
        {items.map((item, i) => (
          <li key={i} className="post-outline-item">
            <span className="post-outline-index">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
