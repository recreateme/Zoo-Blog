import fs from 'fs/promises'
import path from 'path'
import { type StorageProvider } from './provider'

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string
  private publicBase: string

  constructor() {
    this.uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './public/uploads')
    this.publicBase = '/uploads'
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true })

    let finalKey = key
    let finalBuffer = buffer

    // 图片自动压缩为 WebP
    if (mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') {
      try {
        const sharp = (await import('sharp')).default
        const ext = path.extname(key)
        finalKey = key.replace(ext, '.webp')
        finalBuffer = await sharp(buffer)
          .webp({ quality: 82 })
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .toBuffer()
      } catch {
        // sharp 失败时使用原始文件
        console.warn('图片压缩失败，使用原始文件')
      }
    }

    const filePath = path.join(this.uploadDir, finalKey)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, finalBuffer)

    return this.getUrl(finalKey)
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key)
    try {
      await fs.unlink(filePath)
    } catch {
      // 文件不存在时忽略
    }
  }

  getUrl(key: string): string {
    return `${this.publicBase}/${key}`
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.uploadDir, key))
      return true
    } catch {
      return false
    }
  }

  /** 获取图片尺寸 */
  async getImageSize(key: string): Promise<{ width: number; height: number } | null> {
    try {
      const sharp = (await import('sharp')).default
      const filePath = path.join(this.uploadDir, key)
      const meta = await sharp(filePath).metadata()
      if (meta.width && meta.height) {
        return { width: meta.width, height: meta.height }
      }
    } catch {
      // ignore
    }
    return null
  }
}
