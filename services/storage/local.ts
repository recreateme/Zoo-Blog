import fs from 'fs/promises'
import path from 'path'
import { type StorageProvider, type UploadResult } from './provider'
import { processUploadBuffer } from './image-process'

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string
  private publicBase: string

  constructor() {
    this.uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './public/uploads')
    this.publicBase = '/uploads'
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    await fs.mkdir(this.uploadDir, { recursive: true })

    const { buffer: finalBuffer, key: finalKey } = await processUploadBuffer(buffer, key, mimeType)
    const filePath = path.join(this.uploadDir, finalKey)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, finalBuffer)

    return { url: this.getUrl(finalKey), key: finalKey }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key)
    try {
      await fs.unlink(filePath)
    } catch {
      /* 文件不存在时忽略 */
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
      /* ignore */
    }
    return null
  }
}
