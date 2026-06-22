import { OpenAIProvider } from './openai'

export class OllamaProvider extends OpenAIProvider {
  constructor() {
    const base = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '')
    super({
      apiKey: 'ollama',
      baseUrl: `${base}/v1`,
      model: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
    })
  }
}
