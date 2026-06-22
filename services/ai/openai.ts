import type { LLMProvider } from './provider'
import { estimateReadingTime } from './provider'
import type { LLMMessage, AiSummaryResult, AiTagsResult } from '@/types'

export interface OpenAIProviderConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  extraHeaders?: Record<string, string>
}

export class OpenAIProvider implements LLMProvider {
  private baseUrl: string
  private apiKey: string
  private model: string
  private extraHeaders: Record<string, string>

  constructor(config?: OpenAIProviderConfig) {
    this.apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.baseUrl = (config?.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(
      /\/$/,
      ''
    )
    this.model = config?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    this.extraHeaders = config?.extraHeaders ?? {}
    if (!this.apiKey) throw new Error('OPENAI_API_KEY 未配置')
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...this.extraHeaders,
    }
  }

  private async parseChatResponse(res: Response): Promise<string> {
    const body = await res.text()
    if (!res.ok) {
      throw new Error(`LLM API 错误 (${res.status}): ${body.slice(0, 300)}`)
    }
    let data: { choices?: { message?: { content?: string } }[] }
    try {
      data = JSON.parse(body) as typeof data
    } catch {
      throw new Error(`LLM API 返回非 JSON: ${body.slice(0, 200)}`)
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('LLM API 返回空内容')
    return content
  }

  private async complete(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      }),
    })
    return this.parseChatResponse(res)
  }

  async summarize(content: string, title: string): Promise<AiSummaryResult> {
    const { PROMPTS } = await import('./provider')
    const text = await this.complete(PROMPTS.summarize(title, content))
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return { summary: parsed.summary ?? '', keywords: parsed.keywords ?? [] }
    } catch {
      return { summary: text.slice(0, 200), keywords: [] }
    }
  }

  async generateTags(content: string, title: string, category: string): Promise<AiTagsResult> {
    const { PROMPTS } = await import('./provider')
    const text = await this.complete(PROMPTS.tags(title, content, category))
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return { tags: parsed.tags ?? [] }
    } catch {
      return { tags: [] }
    }
  }

  estimateReadingTime(content: string): number {
    return estimateReadingTime(content)
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...messages,
        ],
        max_tokens: 2048,
      }),
    })
    return this.parseChatResponse(res)
  }
}
