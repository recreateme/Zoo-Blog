import dns from 'dns/promises'
import fs from 'fs/promises'
import net from 'net'
import path from 'path'
import { randomUUID } from 'crypto'

const MAX_COVER_BYTES = 8 * 1024 * 1024
const MAX_REDIRECTS = 3
const FETCH_TIMEOUT_MS = 15_000
const ALLOWED_LOCAL_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

export class CoverImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CoverImageError'
  }
}

export interface PreparedCoverImage {
  buffer: Buffer
  absolutePath: string
  url: string
}

interface LocalCoverInput {
  buffer: Buffer
  mimeType: string
}

function publicDirAbsolute(): string {
  return path.resolve(process.env.PUBLIC_DIR ?? './public')
}

function coversDirAbsolute(): string {
  return path.join(publicDirAbsolute(), 'images', 'covers')
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  )
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0]
  if (net.isIPv4(normalized)) return isPrivateIpv4(normalized)
  if (!net.isIPv6(normalized)) return true

  if (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized)
  ) {
    return true
  }

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new CoverImageError('公网图片地址格式无效')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new CoverImageError('公网图片仅支持 http:// 或 https:// 地址')
  }
  if (url.username || url.password) {
    throw new CoverImageError('公网图片地址不能包含账号或密码')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new CoverImageError('公网图片地址不能指向本机或内网')
  }

  let addresses: Array<{ address: string }>
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new CoverImageError('无法解析公网图片地址')
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new CoverImageError('公网图片地址不能指向本机或内网')
  }

  return url
}

async function readResponseWithLimit(response: Response): Promise<Buffer> {
  const declaredSize = Number(response.headers.get('content-length') ?? 0)
  if (declaredSize > MAX_COVER_BYTES) {
    throw new CoverImageError('封面图片不能超过 8MB')
  }
  if (!response.body) throw new CoverImageError('公网图片响应为空')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_COVER_BYTES) {
      await reader.cancel()
      throw new CoverImageError('封面图片不能超过 8MB')
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks, total)
}

async function downloadPublicImage(rawUrl: string): Promise<Buffer> {
  let url = await assertPublicHttpUrl(rawUrl)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    let response: Response
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'knowledge-blog-cover-import/1.0' },
      })
    } catch {
      throw new CoverImageError('下载公网图片失败，请检查地址是否可直接访问')
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirects === MAX_REDIRECTS) {
        throw new CoverImageError('公网图片重定向次数过多')
      }
      url = await assertPublicHttpUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok) {
      throw new CoverImageError(`下载公网图片失败（HTTP ${response.status}）`)
    }
    return readResponseWithLimit(response)
  }

  throw new CoverImageError('下载公网图片失败')
}

async function convertToWebp(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default
    const metadata = await sharp(buffer).metadata()
    if (!metadata.format || !metadata.width || !metadata.height) {
      throw new Error('invalid image')
    }
    return await sharp(buffer)
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    throw new CoverImageError('封面文件不是有效图片，或图片格式不受支持')
  }
}

function safeSlugPart(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9_\u4e00-\u9fff.-]/g, '-').replace(/-+/g, '-')
}

async function prepareCover(buffer: Buffer, slug: string): Promise<PreparedCoverImage> {
  if (buffer.length === 0) throw new CoverImageError('封面图片为空')
  if (buffer.length > MAX_COVER_BYTES) throw new CoverImageError('封面图片不能超过 8MB')

  const processed = await convertToWebp(buffer)
  const fileName = `${safeSlugPart(slug)}-${randomUUID().slice(0, 8)}.webp`
  return {
    buffer: processed,
    absolutePath: path.join(coversDirAbsolute(), fileName),
    url: `/images/covers/${fileName}`,
  }
}

export async function prepareLocalCover(
  input: LocalCoverInput,
  slug: string
): Promise<PreparedCoverImage> {
  if (!ALLOWED_LOCAL_MIME_TYPES.has(input.mimeType)) {
    throw new CoverImageError('本地封面仅支持 JPG、PNG、WebP、GIF 或 AVIF')
  }
  return prepareCover(input.buffer, slug)
}

export async function prepareRemoteCover(
  rawUrl: string,
  slug: string
): Promise<PreparedCoverImage> {
  const buffer = await downloadPublicImage(rawUrl)
  return prepareCover(buffer, slug)
}

export async function persistPreparedCover(cover: PreparedCoverImage): Promise<void> {
  await fs.mkdir(path.dirname(cover.absolutePath), { recursive: true })
  const temporaryPath = `${cover.absolutePath}.tmp-${randomUUID()}`
  try {
    await fs.writeFile(temporaryPath, cover.buffer, { flag: 'wx' })
    await fs.rename(temporaryPath, cover.absolutePath)
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => {})
    throw error
  }
}

export async function removePreparedCover(cover: PreparedCoverImage | null): Promise<void> {
  if (!cover) return
  await fs.unlink(cover.absolutePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}
