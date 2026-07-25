import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { extractPostMeta, parseFrontmatter } from '@/lib/markdown'
import { buildRelativeContentPath, writeMarkdownToContent } from '@/lib/content-write'
import { deleteBoundMarkdownFile } from '@/lib/content-source'
import {
  CoverImageError,
  persistPreparedCover,
  prepareLocalCover,
  prepareRemoteCover,
  removePreparedCover,
  type PreparedCoverImage,
} from '@/lib/cover-image'
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

  let createdPostId: string | null = null
  let writtenMarkdownPath: string | null = null
  let persistedCover: PreparedCoverImage | null = null

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
    const coverFileValue = form.get('coverFile')
    const coverFile = coverFileValue instanceof File && coverFileValue.size > 0
      ? coverFileValue
      : null
    if (coverFile && meta.coverImage?.trim()) {
      return NextResponse.json(
        { error: '本地封面与公网图片地址只能选择一种' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const parsed = extractPostMeta(text, file.name)
    const { content: body } = parseFrontmatter(text)

    // 净化 slug：统一 ASCII，避免中文 slug 在 Next 动态路由中因百分号编码 404
    const { slugifyPostId, isAsciiSlug } = await import('@/lib/post-slug')
    const rawSlug = (meta.slug?.trim() || parsed.id).replace(/^\/+|\/+$/g, '')
    let slug = rawSlug
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fff.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    if (!slug) {
      return NextResponse.json({ error: 'Slug 无效，请手动填写' }, { status: 400 })
    }
    if (!isAsciiSlug(slug)) {
      slug = slugifyPostId(meta.title?.trim() || parsed.title || slug)
    }
    const title = meta.title?.trim() || parsed.title
    const tags = ensureTags(meta.tags?.length ? meta.tags : parsed.tags)
    if (tags.length === 0) {
      return NextResponse.json({ error: '至少需要 1 个标签' }, { status: 400 })
    }

    const status = meta.status ?? parsed.status
    const memberships: SeriesMembershipInput[] =
      meta.series?.map((s) => ({ name: s.name, order: s.order ?? null })) ??
      parsed.seriesMemberships

    const coverSource =
      meta.coverImage !== undefined ? meta.coverImage?.trim() || null : parsed.coverImage
    let preparedCover: PreparedCoverImage | null = null
    let coverImage: string | null = null
    if (coverFile) {
      preparedCover = await prepareLocalCover(
        {
          buffer: Buffer.from(await coverFile.arrayBuffer()),
          mimeType: coverFile.type,
        },
        slug
      )
      coverImage = preparedCover.url
    } else if (coverSource && /^https?:\/\//i.test(coverSource)) {
      preparedCover = await prepareRemoteCover(coverSource, slug)
      coverImage = preparedCover.url
    } else if (coverSource?.startsWith('/')) {
      // 已在 public/ 中的项目资源无需重复复制
      coverImage = coverSource
    } else if (coverSource) {
      throw new CoverImageError('封面应选择本地图片，或填写完整的 http(s) 公网图片地址')
    }
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
      body,
      { overwrite: false }
    )
    writtenMarkdownPath = relativePath

    const post = await prisma.post.create({
      data: {
        id: slug,
        title,
        content: body,
        category: '',
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
    createdPostId = post.id

    await syncPostSeriesMemberships(post.id, memberships)
    if (preparedCover) {
      await persistPreparedCover(preparedCover)
      persistedCover = preparedCover
    }

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
      post: {
        id: post.id,
        title: post.title,
        filePath: post.filePath,
        coverImage: post.coverImage,
      },
      editUrl: `/admin/editor/${post.id}`,
    })
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
    if (persistedCover) {
      await removePreparedCover(persistedCover).catch((rollbackError) => {
        console.error(`回滚封面失败 (${persistedCover?.url}):`, rollbackError)
      })
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '元数据无效', details: error.errors }, { status: 400 })
    }
    if (error instanceof CoverImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Import post error:', error)
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === 'EEXIST') {
      return NextResponse.json(
        { error: '目标 Markdown 文件已存在，请更换 Slug 或目标子目录' },
        { status: 409 }
      )
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return NextResponse.json(
        { error: '服务器内容或图片目录不可写（权限问题），请联系管理员执行部署脚本修复目录属主' },
        { status: 500 }
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `导入失败：${message}` }, { status: 500 })
  }
}
