import type { LLMProvider } from './provider'
import { estimateReadingTime } from './provider'
import type { LLMMessage, AiSummaryResult, AiTagsResult } from '@/types'

export class OpenAIProvider implements LLMProvider {
  private baseUrl: string
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? ''
    this.baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
    this.model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    if (!this.apiKey) throw new Error('OPENAI_API_KEY 未配置')
  }

  private async complete(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...messages,
        ],
        max_tokens: 2048,
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }
}
