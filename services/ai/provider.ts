import { type LLMMessage, type AiSummaryResult, type AiTagsResult } from '@/types'

// ============================================================
// LLM 抽象接口
// ============================================================
export interface LLMProvider {
  /** 生成文章摘要和关键词 */
  summarize(content: string, title: string): Promise<AiSummaryResult>
  /** 智能生成标签 */
  generateTags(content: string, title: string, category: string): Promise<AiTagsResult>
  /** 计算阅读时长（本地计算，无需 API） */
  estimateReadingTime(content: string): number
  /** 通用对话（RAG 问答用） */
  chat(messages: LLMMessage[], systemPrompt?: string): Promise<string>
  /** 生成文本 Embedding（向量化） */
  embed?(text: string): Promise<number[]>
}

// ============================================================
// 工厂函数：根据环境变量选择提供商
// ============================================================
export async function createLLMProvider(): Promise<LLMProvider> {
  const provider = process.env.LLM_PROVIDER ?? 'claude'

  switch (provider) {
    case 'claude': {
      const { ClaudeProvider } = await import('./claude')
      return new ClaudeProvider()
    }
    case 'openai': {
      const { OpenAIProvider } = await import('./openai')
      return new OpenAIProvider()
    }
    case 'deepseek': {
      const { DeepSeekProvider } = await import('./deepseek')
      return new DeepSeekProvider()
    }
    case 'ollama': {
      const { OllamaProvider } = await import('./ollama')
      return new OllamaProvider()
    }
    default:
      throw new Error(`未知的 LLM 提供商: ${provider}`)
  }
}

// ============================================================
// 本地阅读时长计算（不依赖 LLM）
// ============================================================
export function estimateReadingTime(content: string): number {
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) ?? []).length
  const englishWords = (content.replace(/[\u4e00-\u9fa5]/g, '').match(/\b\w+\b/g) ?? []).length
  const minutes = chineseChars / 300 + englishWords / 200
  return Math.max(1, Math.ceil(minutes))
}

// ============================================================
// Prompt 模板
// ============================================================
export const PROMPTS = {
  summarize: (title: string, content: string) => `
你是一个专业的技术博客摘要助手。请为以下文章生成一段精炼的摘要。

要求：
- 摘要长度：120-200个字
- 语言简洁，突出核心知识点
- 提取3-5个关键词
- 以JSON格式返回，不要有任何其他内容

文章标题：${title}
文章内容：
${content.slice(0, 3000)}

请严格返回以下JSON格式：
{
  "summary": "摘要内容",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`.trim(),

  tags: (title: string, content: string, category: string) => `
你是一个技术博客标签生成助手。请为以下文章生成合适的标签。

要求：
- 生成3-6个标签
- 标签要精准、具体，反映文章核心技术点
- 使用小写字母和连字符，如：deep-learning, ospf-protocol
- 以JSON格式返回，不要有任何其他内容

文章分类：${category}
文章标题：${title}
文章内容（部分）：
${content.slice(0, 2000)}

请严格返回以下JSON格式：
{
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "${category}"
}`.trim(),

  rag: (question: string, contexts: string[]) => `
你是用户的个人知识库助手。请根据以下参考内容回答用户的问题。
如果参考内容中没有足够信息，请直接说明，不要编造答案。

参考笔记内容：
${contexts.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}

用户问题：${question}

请用中文回答，并在回答末尾标注参考了哪些笔记（用序号）。`.trim(),
}
