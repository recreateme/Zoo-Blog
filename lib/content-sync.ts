import fs from 'fs/promises'
import path from 'path'
import { parseFrontmatter, extractPostMeta } from '@/lib/markdown'
import { stringifyTags } from '@/lib/utils'
import prisma from '@/lib/db'
import { indexPostById, removePostFromIndex } from '@/lib/search-index'

const CONTENT_DIR = process.env.CONTENT_DIR ?? './content'

export interface SyncResult {
  added: number
  updated: number
  skipped: number
  deleted: number
  indexed: number
  errors: string[]
}

export interface SyncStatus {
  contentFileCount: number
  dbPostCount: number
  fileBoundCount: number
  orphanCount: number
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

/** 扫描文件系统，返回当前 MD 相对路径集合与 path → slug 映射 */
async function scanContentFiles(contentDir: string) {
  const mdFiles = await collectMarkdownFiles(contentDir)
  const relPaths = new Set<string>()
  const pathToId = new Map<string, string>()

  for (const filePath of mdFiles) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const relPath = normalizeRelPath(contentDir, filePath)
      const meta = extractPostMeta(raw, relPath)
      relPaths.add(relPath)
      pathToId.set(relPath, meta.id)
    } catch {
      // 解析失败的文件不参与映射，同步阶段会报错
    }
  }

  return { mdFiles, relPaths, pathToId }
}

/**
 * 以 content/ 为内容源执行完整同步：
 * - 新文件入库
 * - 已绑定 filePath 的笔记在文件更新时覆盖数据库
 * - 文件已删除 → 删除对应 DB 记录
 * - 同文件 slug 变更 → 删除旧 slug 记录
 * - 纯后台创建（无 filePath）的记录永不覆盖或删除
 */
export async function runContentSync(): Promise<SyncResult> {
  const contentDir = path.resolve(CONTENT_DIR)
  const { mdFiles, relPaths, pathToId } = await scanContentFiles(contentDir)

  let added = 0
  let updated = 0
  let skipped = 0
  let deleted = 0
  let indexed = 0
  const errors: string[] = []

  for (const filePath of mdFiles) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const stat = await fs.stat(filePath)
      const relPath = normalizeRelPath(contentDir, filePath)
      const meta = extractPostMeta(raw, relPath)
      const { content } = parseFrontmatter(raw)
      const outlineJson = JSON.stringify(meta.outline)

      const existing = await prisma.post.findUnique({ where: { id: meta.id } })

      if (!existing) {
        await prisma.post.create({
          data: {
            id: meta.id,
            title: meta.title,
            content,
            category: meta.category,
            subcategory: meta.subcategory,
            tags: stringifyTags(meta.tags),
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
        try {
          await indexPostById(meta.id)
          indexed++
        } catch {
          /* 索引失败不阻断同步 */
        }
        continue
      }

      if (!existing.filePath) {
        skipped++
        continue
      }

      if (stat.mtimeMs <= existing.updatedAt.getTime()) {
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
          tags: stringifyTags(meta.tags),
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
      try {
        await indexPostById(meta.id)
        indexed++
      } catch {
        /* ignore */
      }
    } catch (err) {
      errors.push(`${filePath}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 删除：文件已移除，或同路径 slug 已变更
  const fileBoundPosts = await prisma.post.findMany({
    where: { filePath: { not: null } },
    select: { id: true, filePath: true },
  })

  for (const post of fileBoundPosts) {
    const fp = post.filePath!
    const shouldDelete =
      !relPaths.has(fp) || pathToId.get(fp) !== post.id

    if (shouldDelete) {
      await prisma.post.delete({ where: { id: post.id } })
      deleted++
      try {
        await removePostFromIndex(post.id)
      } catch {
        /* ignore */
      }
    }
  }

  return { added, updated, skipped, deleted, indexed, errors }
}

export async function getContentSyncStatus(): Promise<SyncStatus> {
  const contentDir = path.resolve(CONTENT_DIR)
  const { relPaths } = await scanContentFiles(contentDir)
  const mdFiles = await collectMarkdownFiles(contentDir)

  const fileBoundPosts = await prisma.post.findMany({
    where: { filePath: { not: null } },
    select: { filePath: true },
  })

  const orphanCount = fileBoundPosts.filter((p) => !relPaths.has(p.filePath!)).length

  return {
    contentFileCount: mdFiles.length,
    dbPostCount: await prisma.post.count(),
    fileBoundCount: fileBoundPosts.length,
    orphanCount,
    contentDir: CONTENT_DIR,
  }
}
