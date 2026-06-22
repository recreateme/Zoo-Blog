import { OpenAIProvider } from './openai'

export class DeepSeekProvider extends OpenAIProvider {
  constructor() {
    super({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    })
  }
}
