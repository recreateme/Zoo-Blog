/** 默认分块大小（字符） */
export const DEFAULT_CHUNK_SIZE = 800
/** 块间重叠，保留上下文衔接 */
export const DEFAULT_CHUNK_OVERLAP = 100
/** 单篇文章最大块数，防止超长文拖垮索引 */
export const MAX_CHUNKS_PER_POST = 50

export interface TextChunk {
  index: number
  text: string
}

/**
 * 将长文本切分为重叠块，优先在段落/句号处断开。
 */
export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP,
  maxChunks = MAX_CHUNKS_PER_POST
): TextChunk[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const chunks: TextChunk[] = []
  let start = 0
  let index = 0

  while (start < normalized.length && index < maxChunks) {
    let end = Math.min(start + chunkSize, normalized.length)

    if (end < normalized.length) {
      const slice = normalized.slice(start, end)
      const paraBreak = slice.lastIndexOf('\n\n')
      const lineBreak = slice.lastIndexOf('\n')
      const punctBreak = Math.max(
        slice.lastIndexOf('。'),
        slice.lastIndexOf('！'),
        slice.lastIndexOf('？'),
        slice.lastIndexOf('. ')
      )
      const minBreak = Math.floor(chunkSize * 0.4)
      let breakAt = -1
      if (paraBreak >= minBreak) breakAt = paraBreak + 2
      else if (lineBreak >= minBreak) breakAt = lineBreak + 1
      else if (punctBreak >= minBreak) breakAt = punctBreak + 1
      if (breakAt > 0) end = start + breakAt
    }

    const piece = normalized.slice(start, end).trim()
    if (piece) {
      chunks.push({ index, text: piece })
      index += 1
    }

    if (end >= normalized.length) break
    start = Math.max(start + 1, end - overlap)
  }

  return chunks
}
