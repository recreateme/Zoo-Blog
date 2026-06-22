import { createHash } from 'crypto'
import prisma from '@/lib/db'
import { chunkText, MAX_CHUNKS_PER_POST } from '@/lib/text-chunk'
import { createEmbeddingProvider, isEmbeddingConfigured } from '@/lib/embeddings'

const COLLECTION = 'post_chunks'
const SEARCH_LIMIT_DEFAULT = 5

export interface VectorChunkPayload {
  postId: string
  title: string
  category: string
  chunkIndex: number
  text: string
  status: string
}

export interface VectorSearchHit {
  postId: string
  title: string
  category: string
  text: string
  score: number
}

export interface IndexPostOptions {
  /** 全量重建时跳过按篇删除（collection 已清空） */
  skipPurge?: boolean
}

export interface VectorReindexResult {
  indexed: number
  removed: number
  chunks: number
  errors: string[]
}

export function isRagEnabled(): boolean {
  return !!(process.env.QDRANT_URL && isEmbeddingConfigured())
}

export function getVectorMinScore(): number {
  const raw = Number(process.env.VECTOR_MIN_SCORE ?? 0.35)
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.35
}

/** 由 postId + chunkIndex 生成确定性 UUID，供 Qdrant 主键使用 */
export function chunkPointId(postId: string, chunkIndex: number): string {
  const hash = createHash('sha256').update(`${postId}:${chunkIndex}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

function getQdrantBaseUrl(): string {
  const url = process.env.QDRANT_URL
  if (!url) throw new Error('QDRANT_URL 未配置')
  return url.replace(/\/$/, '')
}

function qdrantHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const key = process.env.QDRANT_API_KEY
  if (key) headers['api-key'] = key
  return headers
}

async function qdrantFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getQdrantBaseUrl()}${path}`, {
    ...init,
    headers: { ...qdrantHeaders(), ...init?.headers },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Qdrant 请求失败 (${res.status}): ${body.slice(0, 300)}`)
  }

  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}

interface QdrantCollectionInfo {
  result?: {
    points_count?: number
    config?: {
      params?: {
        vectors?: { size?: number }
      }
    }
  }
}

let collectionReady = false
let collectionVectorSize: number | null = null

async function getCollectionVectorSize(): Promise<number | null> {
  try {
    const data = await qdrantFetch<QdrantCollectionInfo>(`/collections/${COLLECTION}`, {
      method: 'GET',
    })
    return data.result?.config?.params?.vectors?.size ?? null
  } catch {
    return null
  }
}

export async function ensureVectorCollection(): Promise<boolean> {
  if (!isRagEnabled()) return false
  if (collectionReady && collectionVectorSize != null) return true

  const embedder = await createEmbeddingProvider()
  const size = embedder.dimension

  const existingSize = await getCollectionVectorSize()
  if (existingSize != null) {
    if (existingSize !== size) {
      throw new Error(
        `Qdrant collection 向量维度为 ${existingSize}，当前 EMBEDDING_DIMENSION 为 ${size}。请执行 npm run rag:reindex 全量重建。`
      )
    }
    collectionVectorSize = existingSize
    collectionReady = true
    return true
  }

  await qdrantFetch(`/collections/${COLLECTION}`, {
    method: 'PUT',
    body: JSON.stringify({
      vectors: { size, distance: 'Cosine' },
    }),
  })

  collectionVectorSize = size
  collectionReady = true
  return true
}

export async function removePostVectors(postId: string): Promise<void> {
  if (!isRagEnabled()) return
  await ensureVectorCollection()

  await qdrantFetch(`/collections/${COLLECTION}/points/delete`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        must: [{ key: 'postId', match: { value: postId } }],
      },
    }),
  })
}

async function indexPublishedPost(
  post: {
    id: string
    title: string
    content: string
    category: string
    status: string
  },
  options?: IndexPostOptions
): Promise<number> {
  if (!options?.skipPurge) {
    await removePostVectors(post.id)
  }

  const header = `标题：${post.title}\n分类：${post.category}\n\n`
  const fullText = header + post.content
  const chunks = chunkText(fullText)
  if (chunks.length >= MAX_CHUNKS_PER_POST) {
    console.warn(
      `向量索引截断 (${post.id})：仅索引前 ${MAX_CHUNKS_PER_POST} 块，超长尾部未纳入 RAG`
    )
  }
  if (chunks.length === 0) return 0

  const embedder = await createEmbeddingProvider()
  const vectors = await embedder.embedBatch(chunks.map((c) => c.text))

  const points = chunks.map((chunk, i) => ({
    id: chunkPointId(post.id, chunk.index),
    vector: vectors[i],
    payload: {
      postId: post.id,
      title: post.title,
      category: post.category,
      chunkIndex: chunk.index,
      text: chunk.text,
      status: post.status,
    } satisfies VectorChunkPayload,
  }))

  await qdrantFetch(`/collections/${COLLECTION}/points`, {
    method: 'PUT',
    body: JSON.stringify({ points }),
  })

  return points.length
}

export async function indexPostById(
  postId: string,
  options?: IndexPostOptions
): Promise<number> {
  if (!isRagEnabled()) return 0

  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post || post.status !== 'PUBLISHED') {
    await removePostVectors(postId)
    return 0
  }

  await ensureVectorCollection()
  return indexPublishedPost(post, options)
}

export async function searchVectors(
  query: string,
  limit = SEARCH_LIMIT_DEFAULT
): Promise<VectorSearchHit[]> {
  if (!isRagEnabled()) return []

  await ensureVectorCollection()
  const embedder = await createEmbeddingProvider()
  const vector = await embedder.embed(query)
  const minScore = getVectorMinScore()

  const data = await qdrantFetch<{
    result?: { id: string; score: number; payload?: VectorChunkPayload }[]
  }>(`/collections/${COLLECTION}/points/search`, {
    method: 'POST',
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true,
      filter: {
        must: [{ key: 'status', match: { value: 'PUBLISHED' } }],
      },
    }),
  })

  const hits = data.result ?? []
  const seen = new Set<string>()
  const results: VectorSearchHit[] = []

  for (const hit of hits) {
    if (hit.score < minScore) continue
    const payload = hit.payload
    if (!payload) continue
    const dedupeKey = `${payload.postId}:${payload.chunkIndex}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    results.push({
      postId: payload.postId,
      title: payload.title,
      category: payload.category,
      text: payload.text,
      score: hit.score,
    })
  }

  return results
}

export async function reindexAllVectors(): Promise<{ indexed: number; chunks: number }> {
  if (!isRagEnabled()) return { indexed: 0, chunks: 0 }

  await qdrantFetch(`/collections/${COLLECTION}`, { method: 'DELETE' }).catch(() => {
    /* collection 可能不存在 */
  })
  collectionReady = false
  collectionVectorSize = null
  await ensureVectorCollection()

  const posts = await prisma.post.findMany({ where: { status: 'PUBLISHED' } })
  let chunks = 0
  for (const post of posts) {
    chunks += await indexPublishedPost(post, { skipPurge: true })
  }

  return { indexed: posts.length, chunks }
}

export async function reindexChangedVectors(
  removedIds: string[],
  changedIds: string[]
): Promise<VectorReindexResult> {
  const errors: string[] = []
  if (!isRagEnabled()) return { indexed: 0, removed: 0, chunks: 0, errors }

  for (const id of removedIds) {
    try {
      await removePostVectors(id)
    } catch (err) {
      const msg = `向量索引删除失败 (${id}): ${err instanceof Error ? err.message : String(err)}`
      console.warn(msg)
      errors.push(msg)
    }
  }

  let chunks = 0
  for (const id of changedIds) {
    try {
      chunks += await indexPostById(id)
    } catch (err) {
      const msg = `向量索引更新失败 (${id}): ${err instanceof Error ? err.message : String(err)}`
      console.warn(msg)
      errors.push(msg)
    }
  }

  return { indexed: changedIds.length, removed: removedIds.length, chunks, errors }
}

export async function getVectorIndexStats(): Promise<{
  enabled: boolean
  pointCount: number | null
}> {
  if (!isRagEnabled()) return { enabled: false, pointCount: null }

  try {
    const data = await qdrantFetch<QdrantCollectionInfo>(`/collections/${COLLECTION}`, {
      method: 'GET',
    })
    return { enabled: true, pointCount: data.result?.points_count ?? null }
  } catch {
    return { enabled: true, pointCount: null }
  }
}

/** 测试用：重置 collection 就绪缓存 */
export function resetVectorCollectionCache(): void {
  collectionReady = false
  collectionVectorSize = null
}
