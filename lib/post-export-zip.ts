import fs from 'fs/promises'
import path from 'path'
import JSZip from 'jszip'
import { resolveContentFilePath } from '@/lib/content-source'

const PUBLIC_DIR = path.resolve(process.env.PUBLIC_DIR ?? './public')

/** 正文中引用的站内/相对图片路径 */
export function extractMarkdownImageRefs(markdown: string): string[] {
  const refs = new Set<string>()
  const mdRe = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  const htmlRe = /<img[^>]+src=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = mdRe.exec(markdown))) {
    const u = m[1].trim()
    if (u && !u.startsWith('data:')) refs.add(u)
  }
  while ((m = htmlRe.exec(markdown))) {
    const u = m[1].trim()
    if (u && !u.startsWith('data:')) refs.add(u)
  }
  return Array.from(refs)
}

function isAllowedAssetUrl(url: string): boolean {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const u = new URL(url)
      const site = process.env.NEXT_PUBLIC_SITE_URL
      if (!site) return false
      return u.origin === new URL(site).origin
    } catch {
      return false
    }
  }
  if (url.startsWith('/images/') || url.startsWith('/uploads/')) return true
  if (!url.startsWith('/') && !url.startsWith('..')) return true
  return false
}

async function resolveAssetBytes(
  ref: string,
  mdAbsoluteDir: string | null
): Promise<{ bytes: Buffer; ext: string } | null> {
  let localPath: string | null = null

  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    try {
      const u = new URL(ref)
      const pathname = decodeURIComponent(u.pathname)
      if (pathname.startsWith('/images/') || pathname.startsWith('/uploads/')) {
        localPath = path.join(PUBLIC_DIR, pathname.slice(1))
      }
    } catch {
      return null
    }
  } else if (ref.startsWith('/images/') || ref.startsWith('/uploads/')) {
    localPath = path.join(PUBLIC_DIR, ref.slice(1))
  } else if (mdAbsoluteDir) {
    localPath = path.resolve(mdAbsoluteDir, ref)
    if (!localPath.startsWith(path.resolve(process.env.CONTENT_DIR ?? './content')) &&
        !localPath.startsWith(PUBLIC_DIR)) {
      return null
    }
  }

  if (!localPath) return null
  try {
    const bytes = await fs.readFile(localPath)
    const ext = path.extname(localPath) || '.bin'
    return { bytes, ext }
  } catch {
    return null
  }
}

export interface ExportZipInput {
  slug: string
  title: string
  markdownBody: string
  frontmatterRaw?: string | null
  filePath?: string | null
  coverImage?: string | null
}

/** 生成可离线打开的 zip：{slug}/{slug}.md + assets/ */
export async function buildPostExportZip(input: ExportZipInput): Promise<Buffer> {
  const zip = new JSZip()
  const folder = zip.folder(input.slug)!
  const assets = folder.folder('assets')!

  let body = input.markdownBody
  const refs = extractMarkdownImageRefs(body)
  if (input.coverImage && !refs.includes(input.coverImage)) {
    refs.push(input.coverImage)
  }

  let mdDir: string | null = null
  if (input.filePath) {
    try {
      mdDir = path.dirname(resolveContentFilePath(input.filePath))
    } catch {
      mdDir = null
    }
  }

  const rewritten = new Map<string, string>()
  let assetIndex = 0

  for (const ref of refs) {
    if (!isAllowedAssetUrl(ref)) continue
    if (rewritten.has(ref)) continue
    const asset = await resolveAssetBytes(ref, mdDir)
    if (!asset) continue
    assetIndex += 1
    const name = `img-${String(assetIndex).padStart(2, '0')}${asset.ext}`
    assets.file(name, asset.bytes)
    rewritten.set(ref, `./assets/${name}`)
  }

  const pairs = Array.from(rewritten.entries())
  for (const [from, to] of pairs) {
    body = body.split(from).join(to)
  }

  let coverLine = ''
  if (input.coverImage && rewritten.has(input.coverImage)) {
    coverLine = `cover: ${rewritten.get(input.coverImage)}\n`
  } else if (input.coverImage && rewritten.size === 0) {
    coverLine = `cover: ${input.coverImage}\n`
  }

  const fileContent = input.frontmatterRaw
    ? pairs.reduce((raw, [from, to]) => raw.split(from).join(to), input.frontmatterRaw)
    : `---\ntitle: ${JSON.stringify(input.title)}\nslug: ${input.slug}\n${coverLine}---\n\n${body}`

  folder.file(`${input.slug}.md`, fileContent)

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
