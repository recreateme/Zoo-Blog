import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseMarkdown } from '@/lib/markdown'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const { content } = await req.json()
    if (!content) return NextResponse.json({ html: '', toc: [] })

    const { content: html, toc } = await parseMarkdown(content)
    return NextResponse.json({ html, toc })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: '预览生成失败' }, { status: 500 })
  }
}
