import { NextRequest } from 'next/server'
import { servePublicFile } from '@/lib/public-file-response'

export async function GET(
  _req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  return servePublicFile('uploads', params.path ?? [])
}
