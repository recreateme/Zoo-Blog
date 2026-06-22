import { getCategoryById } from '@/lib/categories'
import { seriesGroupId, chapterGroupId } from '@/lib/category-groups'
import { getSiteName as resolveSiteName } from '@/lib/site'

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export function getSiteName(): string {
  return resolveSiteName()
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = getSiteUrl()
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

/** 从 Markdown 提取首图，用于 og:image */
export function extractOgImageFromMarkdown(content: string): string | null {
  const mdMatch = content.match(/!\[[^\]]*\]\(([^)]+)\)/)
  if (mdMatch?.[1]) {
    const url = mdMatch[1].trim()
    if (!url.startsWith('http') && !url.startsWith('/')) return null
    return absoluteUrl(url)
  }
  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (htmlMatch?.[1]) return absoluteUrl(htmlMatch[1].trim())
  return null
}

export function defaultOgImageUrl(): string {
  return absoluteUrl('/og-default.svg')
}

export interface ArticleJsonLdInput {
  id: string
  title: string
  summary: string | null
  content: string
  category: string
  publishedAt: Date | null
  updatedAt: Date
  tags: string[]
  series?: string | null
  subcategory?: string | null
}

export function buildArticleJsonLd(post: ArticleJsonLdInput) {
  const siteUrl = getSiteUrl()
  const cat = getCategoryById(post.category)
  const image =
    extractOgImageFromMarkdown(post.content) ?? defaultOgImageUrl()

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary ?? undefined,
    image: [image],
    datePublished: (post.publishedAt ?? post.updatedAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: process.env.NEXT_PUBLIC_SITE_AUTHOR ?? getSiteName(),
    },
    publisher: {
      '@type': 'Organization',
      name: getSiteName(),
      logo: {
        '@type': 'ImageObject',
        url: defaultOgImageUrl(),
      },
    },
    mainEntityOfPage: `${siteUrl}/post/${post.id}`,
    articleSection: cat?.name ?? post.category,
    keywords: post.tags.join(', ') || undefined,
  }
}

export function buildBreadcrumbJsonLd(
  items: { name: string; url?: string }[]
) {
  const siteUrl = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url ? absoluteUrl(item.url) : undefined,
    })),
  }
}

export function buildPostBreadcrumbItems(post: {
  title: string
  category: string
  series?: string | null
  subcategory?: string | null
}) {
  const cat = getCategoryById(post.category)
  const items: { name: string; url?: string }[] = [
    { name: '首页', url: '/' },
    { name: cat?.name ?? post.category, url: `/${post.category}` },
  ]
  const series = post.series?.trim()
  if (series) {
    items.push({
      name: series,
      url: `/${post.category}#${seriesGroupId(series)}`,
    })
  }
  const chapter = post.subcategory?.trim()
  if (chapter && series) {
    items.push({
      name: chapter,
      url: `/${post.category}#${chapterGroupId(series, chapter)}`,
    })
  }
  items.push({ name: post.title })
  return items
}

export function buildWebSiteJsonLd() {
  const siteUrl = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: getSiteName(),
    url: siteUrl,
    description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildCategoryJsonLd(categoryId: string, postCount: number) {
  const cat = getCategoryById(categoryId)
  if (!cat) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat.name,
    description: cat.description,
    url: absoluteUrl(`/${categoryId}`),
    numberOfItems: postCount,
  }
}

export function buildArticleOpenGraph(post: {
  title: string
  summary: string | null
  content: string
  id: string
  publishedAt: Date | null
  tags: string[]
}) {
  const image = extractOgImageFromMarkdown(post.content) ?? defaultOgImageUrl()
  const url = absoluteUrl(`/post/${post.id}`)
  return {
    title: post.title,
    description: post.summary ?? undefined,
    type: 'article' as const,
    url,
    publishedTime: post.publishedAt?.toISOString(),
    tags: post.tags,
    images: [{ url: image, width: 1200, height: 630, alt: post.title }],
  }
}

export function buildTwitterCard(post: {
  title: string
  summary: string | null
  content: string
}) {
  const image = extractOgImageFromMarkdown(post.content) ?? defaultOgImageUrl()
  return {
    card: 'summary_large_image' as const,
    title: post.title,
    description: post.summary ?? undefined,
    images: [image],
  }
}
