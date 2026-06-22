export interface EmbeddingProvider {
  readonly dimension: number
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

function resolveOpenAICredentials() {
  return {
    apiKey:
      process.env.EMBEDDING_API_KEY ??
      process.env.OPENAI_API_KEY ??
      process.env.OPENROUTER_API_KEY ??
      '',
    baseUrl:
      process.env.EMBEDDING_BASE_URL ??
      process.env.OPENAI_BASE_URL ??
      process.env.OPENROUTER_BASE_URL ??
      'https://api.openai.com/v1',
    model: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
    dimension: Number(process.env.EMBEDDING_DIMENSION ?? 1536),
  }
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly dimension: number
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor() {
    const creds = resolveOpenAICredentials()
    this.apiKey = creds.apiKey
    this.baseUrl = creds.baseUrl.replace(/\/$/, '')
    this.model = creds.model
    this.dimension = creds.dimension
    if (!this.apiKey) throw new Error('EMBEDDING_API_KEY 或 OPENAI_API_KEY 未配置')
  }

  private async requestEmbeddings(inputs: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: inputs }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Embedding API 错误 (${res.status}): ${body.slice(0, 200)}`)
    }

    const data = (await res.json()) as {
      data?: { embedding: number[]; index: number }[]
    }
    const rows = data.data ?? []
    return rows
      .sort((a, b) => a.index - b.index)
      .map((row) => row.embedding)
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.requestEmbeddings([text])
    if (!vector) throw new Error('Embedding API 返回空向量')
    return vector
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    return this.requestEmbeddings(texts)
  }
}

class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly dimension: number
  private baseUrl: string
  private model: string

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '')
    this.model = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text'
    this.dimension = Number(process.env.EMBEDDING_DIMENSION ?? 768)
  }

  private async requestOne(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Ollama Embedding 错误 (${res.status}): ${body.slice(0, 200)}`)
    }

    const data = (await res.json()) as { embedding?: number[] }
    if (!data.embedding?.length) throw new Error('Ollama 返回空向量')
    return data.embedding
  }

  async embed(text: string): Promise<number[]> {
    return this.requestOne(text)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = []
    for (const text of texts) {
      vectors.push(await this.requestOne(text))
    }
    return vectors
  }
}

/** 是否已配置 Embedding（不保证服务可达） */
export function isEmbeddingConfigured(): boolean {
  const provider = process.env.EMBEDDING_PROVIDER
  if (provider === 'ollama') return true
  if (provider === 'openai') {
    return !!(
      process.env.EMBEDDING_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY
    )
  }
  if (
    process.env.EMBEDDING_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY
  ) {
    return true
  }
  return false
}

/** @deprecated 使用 isEmbeddingConfigured */
export function isEmbeddingEnabled(): boolean {
  return isEmbeddingConfigured()
}

export async function createEmbeddingProvider(): Promise<EmbeddingProvider> {
  const explicit = process.env.EMBEDDING_PROVIDER
  if (explicit === 'ollama') return new OllamaEmbeddingProvider()
  if (explicit === 'openai') return new OpenAIEmbeddingProvider()

  if (
    !process.env.EMBEDDING_API_KEY &&
    !process.env.OPENAI_API_KEY &&
    !process.env.OPENROUTER_API_KEY &&
    process.env.OLLAMA_BASE_URL
  ) {
    return new OllamaEmbeddingProvider()
  }

  return new OpenAIEmbeddingProvider()
}
