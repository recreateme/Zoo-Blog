import { MetadataRoute } from 'next'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const [posts, series] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, updatedAt: true },
    }),
    prisma.series.findMany({
      select: { id: true, updatedAt: true },
    }),
  ])

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/post/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const seriesUrls: MetadataRoute.Sitemap = series.map((s) => ({
    url: `${baseUrl}/series/${s.id}`,
    lastModified: s.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/series`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ...seriesUrls,
    ...postUrls,
  ]
}
