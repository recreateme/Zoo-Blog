import { NextRequest, NextResponse } from 'next/server'
import { searchPosts } from '@/lib/search-index'
import { applyRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const rl = applyRateLimit(req, 'api-search', 120, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim() ?? ''
  const tag = searchParams.get('tag')?.trim() ?? ''
  const category = searchParams.get('category')?.trim() ?? ''
  const series = searchParams.get('series')?.trim() ?? ''
  const recent = searchParams.get('recent') === '1'

  try {
    const result = await searchPosts({ q, tag, category, series, recent })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
}
