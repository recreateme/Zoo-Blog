import * as Minio from 'minio'
import { type StorageProvider, type UploadResult } from './provider'
import { processUploadBuffer } from './image-process'

export class MinIOStorageProvider implements StorageProvider {
  private client: Minio.Client
  private bucket: string
  private publicBase: string
  private bucketReady = false

  constructor() {
    const required = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET']
    const missing = required.filter((k) => !process.env[k])
    if (missing.length > 0) throw new Error(`MinIO 配置缺失: ${missing.join(', ')}`)

    this.bucket = process.env.MINIO_BUCKET!
    const endpoint = process.env.MINIO_ENDPOINT!
    const port = parseInt(process.env.MINIO_PORT ?? '9000', 10)
    const useSSL = process.env.MINIO_USE_SSL === 'true'

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    })

    const protocol = useSSL ? 'https' : 'http'
    this.publicBase =
      process.env.MINIO_PUBLIC_URL?.replace(/\/$/, '') ??
      `${protocol}://${endpoint}:${port}/${this.bucket}`
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return
    const exists = await this.client.bucketExists(this.bucket)
    if (!exists) {
      await this.client.makeBucket(this.bucket, process.env.MINIO_REGION ?? '')
    }
    if (process.env.MINIO_PUBLIC_READ !== 'false') {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      }
      try {
        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy))
      } catch (err) {
        console.warn('MinIO 公开读策略设置失败（可手动配置）:', err)
      }
    }
    this.bucketReady = true
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    await this.ensureBucket()
    const { buffer: finalBuffer, key: finalKey, mimeType: finalMime } =
      await processUploadBuffer(buffer, key, mimeType)

    await this.client.putObject(this.bucket, finalKey, finalBuffer, finalBuffer.length, {
      'Content-Type': finalMime,
    })

    return { url: this.getUrl(finalKey), key: finalKey }
  }

  async delete(key: string): Promise<void> {
    await this.ensureBucket()
    try {
      await this.client.removeObject(this.bucket, key)
    } catch {
      /* ignore */
    }
  }

  getUrl(key: string): string {
    return `${this.publicBase}/${key}`
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureBucket()
    try {
      await this.client.statObject(this.bucket, key)
      return true
    } catch {
      return false
    }
  }
}
