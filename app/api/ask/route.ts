import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { createLLMProvider, PROMPTS } from '@/services/ai/provider'
import { isRagEnabled, searchVectors } from '@/lib/vector-index'
import { applyRateLimit } from '@/lib/rate-limit'
import { isAskPublic } from '@/lib/ask-auth'
import type { AskResponse, AskSource } from '@/types'

const askSchema = z.object({
  question: z.string().trim().min(2, '问题太短').max(500, '问题过长'),
})

export async function POST(req: NextRequest) {
  const rl = applyRateLimit(req, 'api-ask', 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  if (!isAskPublic()) {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '请先登录后使用问答功能' }, { status: 401 })
    }
  }

  if (!isRagEnabled()) {
    return NextResponse.json(
      {
        error: 'RAG 未启用，请配置 QDRANT_URL 与 Embedding API',
        enabled: false,
      },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '无效的 JSON' }, { status: 400 })
  }

  const parsed = askSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? '参数无效' },
      { status: 400 }
    )
  }

  const { question } = parsed.data

  try {
    const hits = await searchVectors(question, 5)
    if (hits.length === 0) {
      const empty: AskResponse = {
        answer: '笔记库中暂无相关内容，请尝试换种问法或先同步/发布更多笔记。',
        sources: [],
        enabled: true,
      }
      return NextResponse.json(empty)
    }

    const contexts = hits.map(
      (h) => `《${h.title}》（${h.category}）\n${h.text}`
    )

    const llm = await createLLMProvider()
    const answer = await llm.chat(
      [{ role: 'user', content: question }],
      PROMPTS.rag(contexts)
    )

    const sources: AskSource[] = []
    const seenPosts = new Set<string>()
    for (const hit of hits) {
      if (seenPosts.has(hit.postId)) continue
      seenPosts.add(hit.postId)
      sources.push({
        postId: hit.postId,
        title: hit.title,
        category: hit.category,
        excerpt: hit.text.slice(0, 160),
      })
    }

    const response: AskResponse = { answer, sources, enabled: true }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Ask error:', error)
    const message = error instanceof Error ? error.message : '问答失败，请稍后重试'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
