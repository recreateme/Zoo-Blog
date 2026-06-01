import { MetadataRoute } from 'next'
import prisma from '@/lib/db'
import { CATEGORIES } from '@/lib/categories'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // 获取所有已发布文章
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, updatedAt: true },
  })

  const postUrls: MetadataRoute.Sitemap = posts.map((post: typeof posts[0]) => ({
    url: `${baseUrl}/post/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const categoryUrls: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/${cat.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    ...categoryUrls,
    ...postUrls,
  ]
}
