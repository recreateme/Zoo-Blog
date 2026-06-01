// DeepSeek 兼容 OpenAI API 格式，复用 OpenAIProvider
import { OpenAIProvider } from './openai'

export class DeepSeekProvider extends OpenAIProvider {
  constructor() {
    process.env.OPENAI_API_KEY = process.env.DEEPSEEK_API_KEY ?? ''
    process.env.OPENAI_BASE_URL = 'https://api.deepseek.com/v1'
    process.env.OPENAI_MODEL = 'deepseek-chat'
    super()
  }
}
