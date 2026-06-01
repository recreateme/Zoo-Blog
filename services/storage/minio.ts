import type { StorageProvider } from './provider'

export class MinIOStorageProvider implements StorageProvider {
  constructor() {
    const required = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET']
    const missing = required.filter((k) => !process.env[k])
    if (missing.length > 0) throw new Error(`MinIO 配置缺失: ${missing.join(', ')}`)
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    // TODO: 实现 MinIO 上传
    // npm install minio
    throw new Error('MinIO 上传尚未实现，请参考 README 配置')
  }

  async delete(key: string): Promise<void> {
    throw new Error('MinIO 删除尚未实现')
  }

  getUrl(key: string): string {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost'
    const port = process.env.MINIO_PORT ?? '9000'
    const bucket = process.env.MINIO_BUCKET ?? 'knowledge-blog'
    return `http://${endpoint}:${port}/${bucket}/${key}`
  }

  async exists(key: string): Promise<boolean> {
    return false
  }
}
