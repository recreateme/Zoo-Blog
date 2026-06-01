import type { StorageProvider } from './provider'

export class S3StorageProvider implements StorageProvider {
  constructor() {
    const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET']
    const missing = required.filter((k) => !process.env[k])
    if (missing.length > 0) throw new Error(`S3 配置缺失: ${missing.join(', ')}`)
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    // TODO: 实现 S3 上传
    // npm install @aws-sdk/client-s3
    throw new Error('S3 上传尚未实现，请参考 README 配置')
  }

  async delete(key: string): Promise<void> {
    throw new Error('S3 删除尚未实现')
  }

  getUrl(key: string): string {
    const bucket = process.env.S3_BUCKET ?? 'knowledge-blog'
    const region = process.env.AWS_REGION ?? 'us-east-1'
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
  }

  async exists(key: string): Promise<boolean> {
    return false
  }
}
