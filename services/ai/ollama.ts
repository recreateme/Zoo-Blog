import { OpenAIProvider } from './openai'

export class OllamaProvider extends OpenAIProvider {
  constructor() {
    const base = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
    process.env.OPENAI_API_KEY = 'ollama'
    process.env.OPENAI_BASE_URL = `${base}/v1`
    process.env.OPENAI_MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b'
    super()
  }
}
