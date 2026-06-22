import path from 'path'

export interface ProcessedFile {
  buffer: Buffer
  key: string
  mimeType: string
}

/** 图片转 WebP（与 local 存储行为一致） */
export async function processUploadBuffer(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<ProcessedFile> {
  if (!mimeType.startsWith('image/') || mimeType === 'image/svg+xml') {
    return { buffer, key, mimeType }
  }

  try {
    const sharp = (await import('sharp')).default
    const ext = path.extname(key)
    const finalKey = key.replace(ext, '.webp')
    const finalBuffer = await sharp(buffer)
      .webp({ quality: 82 })
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .toBuffer()
    return { buffer: finalBuffer, key: finalKey, mimeType: 'image/webp' }
  } catch {
    console.warn('图片压缩失败，使用原始文件')
    return { buffer, key, mimeType }
  }
}
