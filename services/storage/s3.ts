import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { type StorageProvider, type UploadResult } from './provider'
import { processUploadBuffer } from './image-process'

export class S3StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string
  private publicBase: string

  constructor() {
    const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET']
    const missing = required.filter((k) => !process.env[k])
    if (missing.length > 0) throw new Error(`S3 配置缺失: ${missing.join(', ')}`)

    this.bucket = process.env.S3_BUCKET!
    this.client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
    })

    const region = process.env.AWS_REGION!
    this.publicBase =
      process.env.S3_PUBLIC_URL?.replace(/\/$/, '') ??
      `https://${this.bucket}.s3.${region}.amazonaws.com`
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    const { buffer: finalBuffer, key: finalKey, mimeType: finalMime } =
      await processUploadBuffer(buffer, key, mimeType)

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: finalKey,
        Body: finalBuffer,
        ContentType: finalMime,
      })
    )

    return { url: this.getUrl(finalKey), key: finalKey }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
      )
    } catch {
      /* ignore */
    }
  }

  getUrl(key: string): string {
    return `${this.publicBase}/${key}`
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key })
      )
      return true
    } catch {
      return false
    }
  }
}
