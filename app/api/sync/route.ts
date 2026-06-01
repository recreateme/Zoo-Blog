import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'
import { parseFrontmatter, extractPostMeta } from '@/lib/markdown'
import { stringifyTags } from '@/lib/utils'
import prisma from '@/lib/db'

const CONTENT_DIR = process.env.CONTENT_DIR ?? './content'

/**
 * POST /api/sync
 * 扫描 content/ 目录下所有 Markdown 文件，
 * 将尚未录入数据库的文件同步进去（不覆盖已有记录的 content 字段，只同步新文件）
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const mdFiles = await collectMarkdownFiles(CONTENT_DIR)
    let added = 0
    let skipped = 0
    const errors: string[] = []

    for (const filePath of mdFiles) {
      try {
        const raw = await fs.readFile(filePath, 'utf-8')
        const meta = extractPostMeta(raw, filePath.replace(CONTENT_DIR, ''))
        const { content } = parseFrontmatter(raw)

        // 检查是否已存在
        const existing = await prisma.post.findUnique({ where: { id: meta.id } })
        if (existing) { skipped++; continue }

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
            readingTime: meta.readingTime,
            filePath: meta.filePath,
            publishedAt: meta.publishedAt,
          },
        })
        added++
      } catch (err) {
        errors.push(`${filePath}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成：新增 ${added} 篇，跳过 ${skipped} 篇`,
      added,
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
    const mdFiles = await collectMarkdownFiles(CONTENT_DIR)
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
