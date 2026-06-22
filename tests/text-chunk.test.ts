import { describe, it, expect } from 'vitest'
import { chunkText, DEFAULT_CHUNK_SIZE, MAX_CHUNKS_PER_POST } from '@/lib/text-chunk'

describe('text-chunk', () => {
  it('returns empty for blank input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n  ')).toEqual([])
  })

  it('keeps short text as single chunk', () => {
    const text = '这是一段短文本。'
    const chunks = chunkText(text)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe(text)
    expect(chunks[0].index).toBe(0)
  })

  it('splits long text into multiple chunks with overlap', () => {
    const paragraph = '段落内容。'.repeat(120)
    const chunks = chunkText(paragraph, 200, 50)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(DEFAULT_CHUNK_SIZE + 50)
    }
  })

  it('respects max chunks limit', () => {
    const huge = 'x'.repeat(DEFAULT_CHUNK_SIZE * (MAX_CHUNKS_PER_POST + 10))
    const chunks = chunkText(huge)
    expect(chunks.length).toBeLessThanOrEqual(MAX_CHUNKS_PER_POST)
  })
})
