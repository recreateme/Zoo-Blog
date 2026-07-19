import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
}

/**
 * 运行期兜底读取 public/ 子目录中的文件。
 * Next standalone 只服务启动时已存在的 public/ 文件，
 * 后台上传的封面/附件在容器重启前会 404；静态命中时不会进入该逻辑。
 */
export async function servePublicFile(
  subdir: 'images' | 'uploads',
  segments: string[]
): Promise<NextResponse> {
  const root = path.resolve(process.env.PUBLIC_DIR ?? './public', subdir)
  const absolute = path.resolve(root, segments.join('/'))
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    return new NextResponse(null, { status: 404 })
  }

  const mime = MIME_BY_EXT[path.extname(absolute).toLowerCase()]
  if (!mime) return new NextResponse(null, { status: 404 })

  try {
    const data = await fs.readFile(absolute)
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
