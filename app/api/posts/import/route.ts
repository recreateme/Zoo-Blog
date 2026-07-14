import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { extractPostMeta, parseFrontmatter } from '@/lib/markdown'
import { buildRelativeContentPath, writeMarkdownToContent } from '@/lib/content-write'
import {
  ensureTags,
  parseSeriesMemberships,
  syncPostSeriesMemberships,
  type SeriesMembershipInput,
} from '@/lib/series-ops'
import { stringifyTags, computePostStats } from '@/lib/utils'
import { indexPostById } from '@/lib/search-index'
import { indexPostById as indexPostVectors } from '@/lib/vector-index'
import { revalidatePublishedContent } from '@/lib/revalidate-content'
import { syncPostLinksForContent, buildWikiSlugMap } from '@/lib/wiki-links'
import { applyRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const MetaSchema = z.object({
  slug: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  summary: z.string().optional(),
  coverImage: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  series: z
    .array(
      z.object({
        name: z.string().min(1),
        order: z.number().int().nullable().optional(),
      })
    )
    .optional(),
  subdir: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const rl = applyRateLimit(req, 'api-posts-import', 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '请求过于频繁' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '请上传 .md 文件' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.md')) {
      return NextResponse.json({ error: '仅支持 Markdown (.md)' }, { status: 400 })
    }

    const rawMeta = form.get('meta')
    let meta = MetaSchema.parse({})
    if (typeof rawMeta === 'string' && rawMeta.trim()) {
      meta = MetaSchema.parse(JSON.parse(rawMeta))
    }

    const text = await file.text()
    const parsed = extractPostMeta(text, file.name)
    const { content: body } = parseFrontmatter(text)

    const slug = (meta.slug?.trim() || parsed.id).replace(/^\/+|\/+$/g, '')
    const title = meta.title?.trim() || parsed.title
    const tags = ensureTags(meta.tags?.length ? meta.tags : parsed.tags)
    if (tags.length === 0) {
      return NextResponse.json({ error: '至少需要 1 个标签' }, { status: 400 })
    }

    const status = meta.status ?? parsed.status
    const memberships: SeriesMembershipInput[] =
      meta.series?.map((s) => ({ name: s.name, order: s.order ?? null })) ??
      parsed.seriesMemberships

    const coverImage =
      meta.coverImage !== undefined ? meta.coverImage : parsed.coverImage
    const subcategory =
      meta.subcategory !== undefined ? meta.subcategory : parsed.subcategory
    const summary = meta.summary ?? parsed.summary

    const existing = await prisma.post.findUnique({ where: { id: slug } })
    if (existing) {
      return NextResponse.json(
        { error: `Slug「${slug}」已存在，请更换或去编辑页更新` },
        { status: 409 }
      )
    }

    const relativePath = buildRelativeContentPath(slug, meta.subdir ?? '')
    const primary = memberships[0] ?? null
    const { readingTime, wordCount } = computePostStats(body)
    const publishedAt = status === 'PUBLISHED' ? parsed.publishedAt ?? new Date() : null

    await writeMarkdownToContent(
      relativePath,
      {
        title,
        slug,
        tags,
        status: status === 'PUBLISHED' ? 'published' : 'draft',
        summary,
        outline: parsed.outline,
        subcategory,
        series: memberships,
        cover: coverImage,
        publishedAt,
      },
      body
    )

    const post = await prisma.post.create({
      data: {
        id: slug,
        title,
        content: body,
        category: parsed.category || 'others',
        subcategory,
        series: primary?.name ?? null,
        seriesOrder: primary?.order ?? null,
        coverImage,
        tags: stringifyTags(tags),
        status,
        summary,
        outline: JSON.stringify(parsed.outline ?? []),
        readingTime,
        wordCount,
        filePath: relativePath,
        publishedAt,
      },
    })

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
      revalidatePublishedContent({ postIds: [post.id] })
      try {
        const slugMap = await buildWikiSlugMap()
        await syncPostLinksForContent(post.id, post.content, slugMap)
      } catch (err) {
        console.warn(`双向链接同步失败 (${post.id}):`, err)
      }
    }

    return NextResponse.json({
      success: true,
      post: { id: post.id, title: post.title, filePath: post.filePath },
      editUrl: `/admin/editor/${post.id}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '元数据无效', details: error.errors }, { status: 400 })
    }
    console.error('Import post error:', error)
    return NextResponse.json({ error: '导入失败' }, { status: 500 })
  }
}
