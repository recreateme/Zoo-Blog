import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createLLMProvider } from '@/services/ai/provider'
import { extractPlainText } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const { content, title } = await req.json()
    if (!content || !title) {
      return NextResponse.json({ error: '缺少 content 或 title 参数' }, { status: 400 })
    }

    const plainText = extractPlainText(content)
    const llm = await createLLMProvider()
    const result = await llm.summarize(plainText, title)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Summarize error:', error)
    return NextResponse.json({ error: 'AI 摘要生成失败，请检查 API Key 配置' }, { status: 500 })
  }
}
