import { OpenAIProvider } from './openai'

/** OpenRouter 兼容 OpenAI Chat Completions API */
export class OpenRouterProvider extends OpenAIProvider {
  constructor() {
    super({
      apiKey: process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      model:
        process.env.OPENROUTER_MODEL ??
        process.env.OPENAI_MODEL ??
        'anthropic/claude-3.5-sonnet',
      extraHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_SITE_NAME ?? 'Knowledge Blog',
      },
    })
  }
}
