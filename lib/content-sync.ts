import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { parseFrontmatter, extractPostMeta } from '@/lib/markdown'
import { stringifyTags } from '@/lib/utils'
import prisma from '@/lib/db'
import { syncPostLinksBatch, removePostLinksForIds } from '@/lib/wiki-links'

const CONTENT_DIR = process.env.CONTENT_DIR ?? './content'

export interface SyncResult {
  added: number
  updated: number
  skipped: number
  deleted: number
  errors: string[]
  indexErrors: string[]
  /** 新增或更新的文章 ID，供增量索引 */
  changedIds: string[]
  /** 已删除的文章 ID */
  removedIds: string[]
}

export interface SyncStatus {
  contentFileCount: number
  dbPostCount: number
  fileBoundCount: number
  orphanCount: number
  parseErrorCount: number
  contentDir: string
}

export function normalizeRelPath(contentDir: string, absolutePath: string): string {
  const rel = path.relative(contentDir, absolutePath)
  return '/' + rel.split(path.sep).join('/')
}

export async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
        results.push(...(await collectMarkdownFiles(fullPath)))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath)
      }
    }
  } catch {
    // 目录不存在时忽略
  }
  return results
}

/** 磁盘上所有 MD 的相对路径（不要求解析成功） */
function buildDiskRelPaths(contentDir: string, mdFiles: string[]): Set<string> {
  return new Set(mdFiles.map((fp) => normalizeRelPath(contentDir, fp)))
}

/** 成功解析的文件 path → slug */
async function buildPathToId(
  contentDir: string,
  mdFiles: string[]
): Promise<{ pathToId: Map<string, string>; parseErrorCount: number }> {
  const pathToId = new Map<string, string>()
  let parseErrorCount = 0

  for (const filePath of mdFiles) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const relPath = normalizeRelPath(contentDir, filePath)
      const meta = extractPostMeta(raw, relPath)
      pathToId.set(relPath, meta.id)
    } catch {
      parseErrorCount++
    }
  }

  return { pathToId, parseErrorCount }
}

/**
 * 判断是否应删除 filePath 绑定的 DB 记录：
 * - 文件已从磁盘移除
 * - 同路径 slug 已变更（且新 slug 已成功解析）
 * 解析失败但文件仍在 → 不删除
 */
export function shouldDeleteFileBoundPost(
  filePath: string,
  postId: string,
  diskRelPaths: Set<string>,
  pathToId: Map<string, string>
): boolean {
  if (!diskRelPaths.has(filePath)) return true
  const expectedId = pathToId.get(filePath)
  return expectedId !== undefined && expectedId !== postId
}

export function countOrphanPostsWithIds(
  fileBoundPosts: { id: string; filePath: string | null }[],
  diskRelPaths: Set<string>,
  pathToId: Map<string, string>
): number {
  return fileBoundPosts.filter((p) => {
    const fp = p.filePath
    if (!fp) return false
    return shouldDeleteFileBoundPost(fp, p.id, diskRelPaths, pathToId)
  }).length
}

/** 同步指纹：内容或元数据变更时更新 DB */
function buildSyncFingerprint(data: {
  content: string
  title: string
  category: string
  subcategory: string | null
  tags: string
  status: string
  summary: string | null
  outline: string
  series: string | null
  seriesOrder: number | null
}): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

function fingerprintFromMeta(
  meta: ReturnType<typeof extractPostMeta>,
  content: string,
  outlineJson: string,
  tags: string
): string {
  return buildSyncFingerprint({
    content,
    title: meta.title,
    category: meta.category,
    subcategory: meta.subcategory,
    tags,
    status: meta.status,
    summary: meta.summary,
    outline: outlineJson,
    series: meta.series,
    seriesOrder: meta.seriesOrder,
  })
}

function fingerprintFromPost(
  post: {
    content: string
    title: string
    category: string
    subcategory: string | null
    tags: string
    status: string
    summary: string | null
    outline: string
    series: string | null
    seriesOrder: number | null
  }
): string {
  return buildSyncFingerprint(post)
}

/**
 * 以 content/ 为内容源执行完整同步：
 * - 新文件入库
 * - 已绑定 filePath 的笔记在文件更新时覆盖数据库
 * - 文件已删除 → 删除对应 DB 记录
 * - 同文件 slug 变更 → 删除旧 slug 记录
 * - 解析失败但文件仍在 → 保留 DB，记入 errors
 * - 纯后台创建（无 filePath）的记录永不覆盖或删除
 */
export async function runContentSync(): Promise<SyncResult> {
  const contentDir = path.resolve(CONTENT_DIR)
  const mdFiles = await collectMarkdownFiles(contentDir)
  const diskRelPaths = buildDiskRelPaths(contentDir, mdFiles)
  const { pathToId } = await buildPathToId(contentDir, mdFiles)

  let added = 0
  let updated = 0
  let skipped = 0
  let deleted = 0
  const errors: string[] = []
  const indexErrors: string[] = []
  const changedIds: string[] = []
  const removedIds: string[] = []

  for (const filePath of mdFiles) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const relPath = normalizeRelPath(contentDir, filePath)
      const meta = extractPostMeta(raw, relPath)
      const { content } = parseFrontmatter(raw)
      const outlineJson = JSON.stringify(meta.outline)
      const tagsJson = stringifyTags(meta.tags)

      const existing = await prisma.post.findUnique({ where: { id: meta.id } })

      if (!existing) {
        await prisma.post.create({
          data: {
            id: meta.id,
            title: meta.title,
            content,
            category: meta.category,
            subcategory: meta.subcategory,
            tags: tagsJson,
            status: meta.status,
            summary: meta.summary,
            outline: outlineJson,
            series: meta.series,
            seriesOrder: meta.seriesOrder,
            readingTime: meta.readingTime,
            wordCount: meta.wordCount,
            filePath: relPath,
            publishedAt: meta.publishedAt,
          },
        })
        added++
        changedIds.push(meta.id)
        continue
      }

      if (!existing.filePath) {
        skipped++
        continue
      }

      const pathChanged = existing.filePath !== relPath
      const fileFp = fingerprintFromMeta(meta, content, outlineJson, tagsJson)
      const dbFp = fingerprintFromPost(existing)

      if (!pathChanged && fileFp === dbFp) {
        skipped++
        continue
      }

      await prisma.post.update({
        where: { id: meta.id },
        data: {
          title: meta.title,
          content,
          category: meta.category,
          subcategory: meta.subcategory,
          tags: tagsJson,
          status: meta.status,
          summary: meta.summary,
          outline: outlineJson,
          series: meta.series,
          seriesOrder: meta.seriesOrder,
          readingTime: meta.readingTime,
          wordCount: meta.wordCount,
          filePath: relPath,
          publishedAt: meta.publishedAt ?? existing.publishedAt,
        },
      })
      updated++
      changedIds.push(meta.id)
    } catch (err) {
      errors.push(`${filePath}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const fileBoundPosts = await prisma.post.findMany({
    where: { filePath: { not: null } },
    select: { id: true, filePath: true },
  })

  const toDelete = fileBoundPosts.filter((post) =>
    shouldDeleteFileBoundPost(post.filePath!, post.id, diskRelPaths, pathToId)
  )

  if (toDelete.length > 0) {
    await prisma.$transaction(
      toDelete.map((post) => prisma.post.delete({ where: { id: post.id } }))
    )
    deleted = toDelete.length
    removedIds.push(...toDelete.map((p) => p.id))
  }

  await removePostLinksForIds(removedIds)
  if (changedIds.length > 0) {
    try {
      await syncPostLinksBatch(changedIds)
    } catch (err) {
      errors.push(`双向链接同步失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { added, updated, skipped, deleted, errors, indexErrors, changedIds, removedIds }
}

export async function getContentSyncStatus(): Promise<SyncStatus> {
  const contentDir = path.resolve(CONTENT_DIR)
  const mdFiles = await collectMarkdownFiles(contentDir)
  const diskRelPaths = buildDiskRelPaths(contentDir, mdFiles)
  const { pathToId, parseErrorCount } = await buildPathToId(contentDir, mdFiles)

  const fileBoundPosts = await prisma.post.findMany({
    where: { filePath: { not: null } },
    select: { id: true, filePath: true },
  })

  const orphanCount = countOrphanPostsWithIds(fileBoundPosts, diskRelPaths, pathToId)

  return {
    contentFileCount: mdFiles.length,
    dbPostCount: await prisma.post.count(),
    fileBoundCount: fileBoundPosts.length,
    orphanCount,
    parseErrorCount,
    contentDir: CONTENT_DIR,
  }
}
