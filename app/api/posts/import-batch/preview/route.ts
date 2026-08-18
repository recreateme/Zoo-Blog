import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { parseFrontmatter } from '@/lib/markdown'
import { parseSeriesMemberships } from '@/lib/series-ops'
import { isAsciiSlug } from '@/lib/post-slug'
import { applyRateLimit } from '@/lib/rate-limit'
import {
  MAX_BATCH_IMPORT_FILES,
  collectFormFiles,
  extractFirstH1,
  isMarkdownFileName,
  mergeTagLists,
  naturalFilenameCompare,
  orderFromMemberships,
  resolveBatchSlug,
  resolveBatchTitle,
  suggestAvailableSlug,
  tagsFromFrontmatter,
  type BatchPreviewItem,
} from '@/lib/post-batch-import'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 60
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
  defaultTags: z.array(z.string()).min(1),
  subdir: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  orderStart: z.number().int().optional(),
  orderStep: z.number().int().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const rl = applyRateLimit(req, 'api-posts-import-batch-preview', 20, 60_000)
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
    if (files.some((f) => !isMarkdownFileName(f.name))) {
      return NextResponse.json({ error: '仅支持 Markdown (.md)' }, { status: 400 })
    }

    const rawMeta = form.get('meta')
    if (typeof rawMeta !== 'string' || !rawMeta.trim()) {
      return NextResponse.json({ error: '缺少 meta' }, { status: 400 })
    }
    const meta = MetaSchema.parse(JSON.parse(rawMeta))
    const defaultTags = mergeTagLists(meta.defaultTags)
    if (defaultTags.length < 1) {
      return NextResponse.json({ error: '至少需要 1 个默认标签' }, { status: 400 })
    }

    if (meta.targetSeries.mode === 'existing') {
      const existing = await prisma.series.findUnique({
        where: { id: meta.targetSeries.id },
        select: { id: true },
      })
      if (!existing) {
        return NextResponse.json({ error: '目标专题不存在' }, { status: 404 })
      }
    } else {
      const clash = await prisma.series.findUnique({
        where: { name: meta.targetSeries.name.trim() },
        select: { id: true },
      })
      if (clash) {
        return NextResponse.json({ error: '专题名已存在，请改用已有专题' }, { status: 409 })
      }
    }

    const orderStart = meta.orderStart ?? 10
    const orderStep = meta.orderStep ?? 10
    const sorted = [...files].sort((a, b) => naturalFilenameCompare(a.name, b.name))
    const names = sorted.map((f) => f.name)
    if (new Set(names).size !== names.length) {
      return NextResponse.json({ error: '存在重复文件名，请先去重后再导入' }, { status: 400 })
    }

    const existingIds = await prisma.post.findMany({ select: { id: true } })
    const taken = new Set(existingIds.map((p) => p.id))

    const items: BatchPreviewItem[] = []
    for (let i = 0; i < sorted.length; i++) {
      const file = sorted[i]
      const warnings: string[] = []
      const text = await file.text()
      const { frontmatter, content: body } = parseFrontmatter(text)
      const title = resolveBatchTitle(frontmatter.title, body, file.name)
      if (!file.size || !body.trim()) {
        warnings.push('文件为空')
      }
      if (
        (typeof frontmatter.title !== 'string' || !frontmatter.title.trim()) &&
        !extractFirstH1(body)
      ) {
        warnings.push('未检测到一级标题，已用文件名作为标题')
      }

      const memberships = parseSeriesMemberships(
        frontmatter.series,
        frontmatter.seriesOrder ?? frontmatter.order
      )
      const order = orderFromMemberships(memberships, orderStart + i * orderStep)
      const tags = mergeTagLists(tagsFromFrontmatter(frontmatter.tags), defaultTags)
      const baseSlug = resolveBatchSlug(frontmatter.slug, title)
      const { slug, slugConflict } = suggestAvailableSlug(baseSlug, taken)
      taken.add(slug)

      if (slugConflict) {
        warnings.push(`Slug「${baseSlug}」已存在，已建议为「${slug}」`)
      }
      if (!isAsciiSlug(slug)) {
        warnings.push('当前 slug 含非 ASCII 字符，建议改成英文短名')
      } else if (slug.startsWith('post-') && !isAsciiSlug(title)) {
        warnings.push('中文标题已生成哈希 slug，建议改成好记的英文')
      }

      items.push({
        filename: file.name,
        title,
        slug,
        slugConflict,
        tags,
        order,
        warnings: warnings.filter((w, idx, arr) => arr.indexOf(w) === idx),
      })
    }

    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '元数据无效', details: error.errors }, { status: 400 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'meta 不是合法 JSON' }, { status: 400 })
    }
    console.error('Import-batch preview error:', error)
    return NextResponse.json({ error: '预览失败' }, { status: 500 })
  }
}
