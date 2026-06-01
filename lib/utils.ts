import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// ============================================================
// CSS 类名合并
// ============================================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// 日期格式化
// ============================================================
export function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy年M月d日', { locale: zhCN })
}

export function formatDateShort(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'yyyy-MM-dd')
}

export function formatDateRelative(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN })
}

// ============================================================
// 阅读时长计算
// ============================================================
export function calculateReadingTime(content: string): number {
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (content.replace(/[\u4e00-\u9fa5]/g, '').match(/\b\w+\b/g) || []).length
  // 中文 300字/分钟，英文 200词/分钟
  const minutes = chineseChars / 300 + englishWords / 200
  return Math.max(1, Math.ceil(minutes))
}

// ============================================================
// Slug 生成
// ============================================================
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]/g, (char) => {
      // 保留中文直接转为拼音首字母（简单处理）
      return char
    })
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// ============================================================
// 文件大小格式化
// ============================================================
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ============================================================
// Tags 序列化/反序列化（SQLite 存为 JSON 字符串）
// ============================================================
export function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags)
}

// ============================================================
// 截断文本
// ============================================================
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).replace(/\s+\S*$/, '') + '…'
}

// ============================================================
// 从 Markdown 内容中提取纯文本（用于摘要生成）
// ============================================================
export function extractPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')           // 移除代码块
    .replace(/`[^`]*`/g, '')                  // 移除行内代码
    .replace(/#{1,6}\s+/g, '')               // 移除标题
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接取文本
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')    // 移除图片
    .replace(/[*_~]{1,2}([^*_~]+)[*_~]{1,2}/g, '$1') // 移除格式
    .replace(/^\s*[-*+>]\s+/gm, '')          // 移除列表符号
    .replace(/\n{2,}/g, '\n')               // 合并空行
    .trim()
}

// ============================================================
// 生成摘要（从内容截取）
// ============================================================
export function generateExcerpt(content: string, length = 160): string {
  return truncate(extractPlainText(content), length)
}

// ============================================================
// 解析双向链接 [[note-title]]
// ============================================================
export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g
  const result: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    result.push(match[1])
  }
  return result
}

// ============================================================
// 数字格式化（千位分隔）
// ============================================================
export function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}
