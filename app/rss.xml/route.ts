import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseTags } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? '个人知识库'
  const siteDesc = process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? '我的学习笔记'
  const author = process.env.NEXT_PUBLIC_SITE_AUTHOR ?? 'Author'

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 30,
    select: {
      id: true, title: true, summary: true, category: true,
      tags: true, publishedAt: true, updatedAt: true,
    },
  })

  const items = posts.map((post: typeof posts[0]) => {
    const tags = parseTags(post.tags)
    const pubDate = (post.publishedAt ?? post.updatedAt).toUTCString()
    const categories = tags.map((t) => `<category>${t}</category>`).join('\n        ')

    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/post/${post.id}</link>
      <guid isPermaLink="true">${baseUrl}/post/${post.id}</guid>
      <pubDate>${pubDate}</pubDate>
      ${post.summary ? `<description><![CDATA[${post.summary}]]></description>` : ''}
      ${categories}
      <author>${author}</author>
    </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}</title>
    <link>${baseUrl}</link>
    <description>${siteDesc}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
