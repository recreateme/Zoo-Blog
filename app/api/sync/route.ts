import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'
import { parseFrontmatter, extractPostMeta } from '@/lib/markdown'
import { stringifyTags } from '@/lib/utils'
import prisma from '@/lib/db'

const CONTENT_DIR = process.env.CONTENT_DIR ?? './content'

function normalizeRelPath(contentDir: string, absolutePath: string): string {
  const rel = path.relative(contentDir, absolutePath)
  return '/' + rel.split(path.sep).join('/')
}

/**
 * POST /api/sync
 * 以 content/ 下 Markdown 为源：新增入库；已绑定 filePath 的条目在文件更新时覆盖数据库
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const contentDir = path.resolve(CONTENT_DIR)
    const mdFiles = await collectMarkdownFiles(contentDir)
    let added = 0
    let updated = 0
    let skipped = 0
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
          continue
        }

        // 已绑定 filePath 的笔记以文件为准；纯后台创建（无 filePath）不覆盖
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
      } catch (err) {
        errors.push(`${filePath}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成：新增 ${added} 篇，更新 ${updated} 篇，跳过 ${skipped} 篇`,
      added,
      updated,
      skipped,
      errors,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: '同步失败' }, { status: 500 })
  }
}

/** GET /api/sync — 获取同步状态 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const contentDir = path.resolve(CONTENT_DIR)
    const mdFiles = await collectMarkdownFiles(contentDir)
    const dbCount = await prisma.post.count()
    return NextResponse.json({
      contentFileCount: mdFiles.length,
      dbPostCount: dbCount,
      contentDir: CONTENT_DIR,
    })
  } catch (error) {
    return NextResponse.json({ error: '获取同步状态失败' }, { status: 500 })
  }
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
        results.push(...await collectMarkdownFiles(fullPath))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath)
      }
    }
  } catch {
    // 目录不存在时忽略
  }
  return results
}
