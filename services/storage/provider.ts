// ============================================================
// 存储服务抽象接口
// ============================================================
export interface StorageProvider {
  /** 上传文件，返回访问 URL */
  upload(buffer: Buffer, key: string, mimeType: string): Promise<string>
  /** 删除文件 */
  delete(key: string): Promise<void>
  /** 获取文件访问 URL */
  getUrl(key: string): string
  /** 检查文件是否存在 */
  exists(key: string): Promise<boolean>
}

// ============================================================
// 工厂函数
// ============================================================
export async function createStorageProvider(): Promise<StorageProvider> {
  const provider = process.env.STORAGE_PROVIDER ?? 'local'

  switch (provider) {
    case 'local': {
      const { LocalStorageProvider } = await import('./local')
      return new LocalStorageProvider()
    }
    case 'minio': {
      const { MinIOStorageProvider } = await import('./minio')
      return new MinIOStorageProvider()
    }
    case 's3': {
      const { S3StorageProvider } = await import('./s3')
      return new S3StorageProvider()
    }
    default:
      throw new Error(`未知的存储提供商: ${provider}`)
  }
}

// ============================================================
// 文件类型判断
// ============================================================
export function getAttachmentType(mimeType: string): 'IMAGE' | 'PDF' | 'WORD' | 'OTHER' {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType === 'application/pdf') return 'PDF'
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  )
    return 'WORD'
  return 'OTHER'
}

// ============================================================
// 允许的文件类型
// ============================================================
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE ?? '10485760') // 10MB
