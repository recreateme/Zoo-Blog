import matter from 'gray-matter'

/** 从 frontmatter.outline 或 summary 中解析文首要点列表 */
export function getArticleOutline(
  content: string,
  summary: string | null,
  outlineJson?: string | null
): string[] {
  if (outlineJson) {
    try {
      const parsed = JSON.parse(outlineJson) as unknown
      if (Array.isArray(parsed)) {
        const items = parsed.filter(
          (x): x is string => typeof x === 'string' && x.trim().length > 0
        )
        if (items.length > 0) return items
      }
    } catch {
      /* ignore */
    }
  }

  const { data } = matter(content)
  const fm = data.outline
  if (Array.isArray(fm)) {
    const items = fm.filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0
    )
    if (items.length > 0) return items
  }

  if (summary) return parseOutlineFromText(summary)
  return []
}

function parseOutlineFromText(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const items: string[] = []
  for (const line of lines) {
    const m = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/)
    if (m) items.push(m[1].trim())
  }
  return items.length >= 2 ? items : []
}
