import Anthropic from '@anthropic-ai/sdk'
import { type LLMProvider } from './provider'
import { PROMPTS, estimateReadingTime } from './provider'
import { type LLMMessage, type AiSummaryResult, type AiTagsResult } from '@/types'

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  async summarize(content: string, title: string): Promise<AiSummaryResult> {
    const prompt = PROMPTS.summarize(title, content)

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    try {
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return {
        summary: parsed.summary ?? '',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      }
    } catch {
      // 解析失败时返回原始文本作为摘要
      return { summary: text.slice(0, 200), keywords: [] }
    }
  }

  async generateTags(content: string, title: string, category: string): Promise<AiTagsResult> {
    const prompt = PROMPTS.tags(title, content, category)

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    try {
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return {
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        category: parsed.suggestedCategory,
      }
    } catch {
      return { tags: [] }
    }
  }

  estimateReadingTime(content: string): number {
    return estimateReadingTime(content)
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    return message.content[0].type === 'text' ? message.content[0].text : ''
  }
}
