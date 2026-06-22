import { NextRequest, NextResponse } from 'next/server'
import { getGraphData, type GraphView } from '@/lib/graph-data'

function parseView(param: string | null): GraphView {
  if (param === 'tags') return 'tags'
  if (param === 'timeline') return 'timeline'
  return 'links'
}

export async function GET(req: NextRequest) {
  const view = parseView(req.nextUrl.searchParams.get('view'))

  try {
    const data = await getGraphData(view)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Graph API error:', error)
    return NextResponse.json({ error: '图谱数据加载失败' }, { status: 500 })
  }
}
