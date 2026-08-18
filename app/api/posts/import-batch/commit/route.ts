import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { parseFrontmatter } from '@/lib/markdown'
import { buildRelativeContentPath, writeMarkdownToContent } from '@/lib/content-write'
import { deleteBoundMarkdownFile } from '@/lib/content-source'
import { slugifySeriesName, syncPostSeriesMemberships } from '@/lib/series-ops'
import { stringifyTags, computePostStats } from '@/lib/utils'
import { indexPostById } from '@/lib/search-index'
import { indexPostById as indexPostVectors } from '@/lib/vector-index'
import { revalidatePublishedContent } from '@/lib/revalidate-content'
import { syncPostLinksForContent, buildWikiSlugMap } from '@/lib/wiki-links'
import { applyRateLimit } from '@/lib/rate-limit'
import { isAsciiSlug, slugifyPostId } from '@/lib/post-slug'
import {
  MAX_BATCH_IMPORT_FILES,
  collectFormFiles,
  isMarkdownFileName,
  mergeTagLists,
  sanitizeSlugCandidate,
  type BatchCommitItem,
} from '@/lib/post-batch-import'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 180
export const dynamic = 'force-dynamic'

const MetaSchema = z.object({
  targetSeries: z.union([
    z.object({ mode: z.literal('existing'), id: z.string().min(1) }),
    z.object({
      mode: z.literal('new'),
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    }),
  ]),
  defaultTags: z.array(z.string()).optional(),
  subdir: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
})

const CommitItemSchema = z.object({
  filename: z.string().min(1),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  tags: z.array(z.string()).min(1),
  order: z.number().int(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const rl = applyRateLimit(req, 'api-posts-import-batch', 5, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '请求过于频繁' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  try {
    const form = await req.formData()
    const files = collectFormFiles(form)
    if (files.length < 1 || files.length > MAX_BATCH_IMPORT_FILES) {
      return NextResponse.json(
        { error: `请选择 1～${MAX_BATCH_IMPORT_FILES} 个 Markdown 文件` },
        { status: 400 }
      )
    }

    const rawItems = form.get('items')
    const rawMeta = form.get('meta')
    if (typeof rawItems !== 'string' || !rawItems.trim() || typeof rawMeta !== 'string' || !rawMeta.trim()) {
      return NextResponse.json({ error: '缺少 items 或 meta' }, { status: 400 })
    }

    const items = z.array(CommitItemSchema).min(1).max(MAX_BATCH_IMPORT_FILES).parse(JSON.parse(rawItems))
    const meta = MetaSchema.parse(JSON.parse(rawMeta))

    const fileByName = new Map<string, File>()
    for (const file of files) {
      if (!isMarkdownFileName(file.name)) {
        return NextResponse.json({ error: '仅支持 Markdown (.md)' }, { status: 400 })
      }
      if (fileByName.has(file.name)) {
        return NextResponse.json({ error: '存在重复文件名，请先去重后再导入' }, { status: 400 })
      }
      fileByName.set(file.name, file)
    }

    for (const item of items) {
      if (!fileByName.has(item.filename)) {
        return NextResponse.json(
          { error: `未找到与「${item.filename}」对应的上传文件` },
          { status: 400 }
        )
      }
    }

    let seriesId: string
    let targetSeriesName: string
    if (meta.targetSeries.mode === 'new') {
      const name = meta.targetSeries.name.trim()
      const dup = await prisma.series.findUnique({ where: { name } })
      if (dup) {
        return NextResponse.json({ error: '专题名已存在，请改用已有专题' }, { status: 409 })
      }
      seriesId = await uniqueSeriesId(name)
      const created = await prisma.series.create({
        data: {
          id: seriesId,
          name,
          description: meta.targetSeries.description?.trim() || null,
        },
      })
      targetSeriesName = created.name
    } else {
      const existing = await prisma.series.findUnique({
        where: { id: meta.targetSeries.id },
      })
      if (!existing) return NextResponse.json({ error: '目标专题不存在' }, { status: 404 })
      seriesId = existing.id
      targetSeriesName = existing.name
    }

    const results: Array<{
      filename: string
      success: boolean
      postId?: string
      error?: string
    }> = []

    const slugMap =
      meta.status === 'PUBLISHED' ? await buildWikiSlugMap() : ({} as Record<string, string>)

    for (const item of items) {
      const file = fileByName.get(item.filename)
      if (!file) {
        results.push({ filename: item.filename, success: false, error: '未找到对应文件' })
        continue
      }
      const imported = await importOneConfirmedItem({
        file,
        item,
        seriesName: targetSeriesName,
        subdir: meta.subdir ?? '',
        status: meta.status,
        slugMap,
      })
      results.push(imported)
      if (imported.success && imported.postId && meta.status === 'PUBLISHED') {
        slugMap[imported.postId] = imported.postId
        slugMap[item.title.trim()] = imported.postId
      }
    }

    const successIds = results.filter((r) => r.success && r.postId).map((r) => r.postId!)
    if (meta.status === 'PUBLISHED' && successIds.length > 0) {
      revalidatePublishedContent({ postIds: successIds, seriesIds: [seriesId] })
    }

    return NextResponse.json({ results, seriesId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数无效', details: error.errors }, { status: 400 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'items/meta 不是合法 JSON' }, { status: 400 })
    }
    console.error('Import-batch commit error:', error)
    return NextResponse.json({ error: '批量导入失败' }, { status: 500 })
  }
}

async function uniqueSeriesId(name: string): Promise<string> {
  let id = slugifySeriesName(name)
  let n = 0
  while (await prisma.series.findUnique({ where: { id } })) {
    n += 1
    id = `${slugifySeriesName(name)}-${n}`
  }
  return id
}

async function importOneConfirmedItem(opts: {
  file: File
  item: BatchCommitItem
  seriesName: string
  subdir: string
  status: 'DRAFT' | 'PUBLISHED'
  slugMap: Record<string, string>
}): Promise<{ filename: string; success: boolean; postId?: string; error?: string }> {
  const { file, item, seriesName, subdir, status, slugMap } = opts
  let createdPostId: string | null = null
  let writtenMarkdownPath: string | null = null

  try {
    if (!file.size) {
      throw new Error('文件为空')
    }

    const tags = mergeTagLists(item.tags)
    if (tags.length === 0) {
      throw new Error('至少需要 1 个标签')
    }

    let slug = sanitizeSlugCandidate(item.slug)
    if (!slug) throw new Error('Slug 无效，请手动填写')
    if (!isAsciiSlug(slug)) slug = slugifyPostId(item.title.trim() || slug)

    const existing = await prisma.post.findUnique({ where: { id: slug } })
    if (existing) {
      throw new Error(`Slug「${slug}」已存在，请更换`)
    }

    const text = await file.text()
    const { content: body } = parseFrontmatter(text)
    if (!body.trim()) {
      throw new Error('文件正文为空')
    }

    const { readingTime, wordCount } = computePostStats(body)
    const relativePath = buildRelativeContentPath(slug, subdir)
    const publishedAt = status === 'PUBLISHED' ? new Date() : null
    const memberships = [{ name: seriesName, order: item.order }]

    await writeMarkdownToContent(
      relativePath,
      {
        title: item.title.trim(),
        slug,
        tags,
        status: status === 'PUBLISHED' ? 'published' : 'draft',
        series: memberships,
        publishedAt,
      },
      body,
      { overwrite: false }
    )
    writtenMarkdownPath = relativePath

    const post = await prisma.post.create({
      data: {
        id: slug,
        title: item.title.trim(),
        content: body,
        category: '',
        tags: stringifyTags(tags),
        status,
        series: seriesName,
        seriesOrder: item.order,
        readingTime,
        wordCount,
        filePath: relativePath,
        publishedAt,
      },
    })
    createdPostId = post.id

    await syncPostSeriesMemberships(post.id, memberships)

    try {
      await indexPostById(post.id)
    } catch (err) {
      console.warn(`搜索索引失败 (${post.id}):`, err)
    }
    try {
      await indexPostVectors(post.id)
    } catch (err) {
      console.warn(`向量索引失败 (${post.id}):`, err)
    }

    if (post.status === 'PUBLISHED') {
      try {
        await syncPostLinksForContent(post.id, post.content, slugMap)
      } catch (err) {
        console.warn(`双向链接同步失败 (${post.id}):`, err)
      }
    }

    return { filename: item.filename, success: true, postId: post.id }
  } catch (error) {
    if (createdPostId) {
      await prisma.post.delete({ where: { id: createdPostId } }).catch((rollbackError) => {
        console.error(`回滚文章失败 (${createdPostId}):`, rollbackError)
      })
    }
    if (writtenMarkdownPath) {
      await deleteBoundMarkdownFile(writtenMarkdownPath).catch((rollbackError) => {
        console.error(`回滚 Markdown 失败 (${writtenMarkdownPath}):`, rollbackError)
      })
    }

    const code = (error as NodeJS.ErrnoException)?.code
    let message = error instanceof Error ? error.message : String(error)
    if (code === 'EEXIST') message = '目标 Markdown 文件已存在，请更换 Slug 或目标子目录'
    if (code === 'EACCES' || code === 'EPERM') {
      message = '服务器内容目录不可写（权限问题），请联系管理员修复目录属主'
    }
    console.warn(`[import-batch] fail file=${item.filename}: ${message}`)
    return { filename: item.filename, success: false, error: message }
  }
}
