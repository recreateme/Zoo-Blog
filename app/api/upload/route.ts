import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import prisma from '@/lib/db'
import {
  createStorageProvider,
  getAttachmentType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/services/storage/provider'
import { applyRateLimit } from '@/lib/rate-limit'
import type { Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
  const rl = applyRateLimit(req, 'api-upload', 30, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '上传过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const postId = formData.get('postId') as string | null

    if (!file) return NextResponse.json({ error: '未找到文件' }, { status: 400 })

    // 验证文件类型
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `不支持的文件类型: ${file.type}` }, { status: 400 })
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `文件大小超出限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = path.extname(file.name)
    const uuid = uuidv4()
    const storedKey = `${uuid}${ext}`

    // Word 文件转换为 Markdown
    let convertedMarkdown: string | null = null
    if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      try {
        const mammoth = (await import('mammoth')).default
        const result = await mammoth.extractRawText({ buffer })
        convertedMarkdown = result.value
      } catch (err) {
        console.warn('Word 转换失败:', err)
      }
    }

    // 上传文件
    const storage = await createStorageProvider()
    const { url, key: storedKeyFinal } = await storage.upload(buffer, storedKey, file.type)

    // 获取图片尺寸
    let width: number | null = null
    let height: number | null = null
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        const sharp = (await import('sharp')).default
        const meta = await sharp(buffer).metadata()
        width = meta.width ?? null
        height = meta.height ?? null
      } catch { /* ignore */ }
    }

    // 保存到数据库
    const attachment = await prisma.attachment.create({
      data: {
        originalName: file.name,
        storedKey: storedKeyFinal,
        url,
        type: getAttachmentType(file.type),
        mimeType: file.type,
        size: file.size,
        width,
        height,
        postId: postId || null,
      },
    })

    return NextResponse.json({
      success: true,
      attachment,
      url,
      convertedMarkdown,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}

// GET /api/upload - 获取附件列表
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const postId = searchParams.get('postId')
  const type = searchParams.get('type')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 30

  const where: Prisma.AttachmentWhereInput = {}
  if (postId) where.postId = postId
  if (type) where.type = type

  const [attachments, total] = await Promise.all([
    prisma.attachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.attachment.count({ where }),
  ])

  return NextResponse.json({ attachments, total })
}

// DELETE /api/upload?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  try {
    const attachment = await prisma.attachment.findUnique({ where: { id } })
    if (!attachment) return NextResponse.json({ error: '附件不存在' }, { status: 404 })

    const storage = await createStorageProvider()
    await storage.delete(attachment.storedKey)
    await prisma.attachment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
