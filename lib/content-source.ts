import fs from 'fs/promises'
import path from 'path'

const CONTENT_DIR = process.env.CONTENT_DIR ?? './content'

/** 将 DB 中的 filePath 转为磁盘绝对路径 */
export function resolveContentFilePath(filePath: string): string {
  const contentDir = path.resolve(CONTENT_DIR)
  const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const absolute = path.resolve(contentDir, normalized)
  if (!absolute.startsWith(contentDir)) {
    throw new Error('非法文件路径')
  }
  return absolute
}

/** 删除 content/ 下绑定的 Markdown 文件（若存在） */
export async function deleteBoundMarkdownFile(filePath: string): Promise<boolean> {
  const absolute = resolveContentFilePath(filePath)
  try {
    await fs.unlink(absolute)
    return true
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw err
  }
}
