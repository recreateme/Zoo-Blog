import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildPostExportZip } from '@/lib/post-export-zip'
import { loadPostExportInput } from '@/lib/post-export-load'
import { decodeRouteParam } from '@/lib/route-params'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const id = decodeRouteParam(params.slug)
  const input = await loadPostExportInput(id)
  if (!input) return NextResponse.json({ error: '文章不存在' }, { status: 404 })

  const zip = await buildPostExportZip(input)

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${input.slug}.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
