import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import Providers from '@/components/providers'
import SiteShell from '@/components/layout/SiteShell'
import { SITE_THEME_IDS } from '@/lib/themes'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: `%s · ${process.env.NEXT_PUBLIC_SITE_NAME ?? '个人知识库'}`,
    default: process.env.NEXT_PUBLIC_SITE_NAME ?? '个人知识库',
  },
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? '我的学习笔记与知识积累',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? '个人知识库',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* KaTeX CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        {/* highlight.js 由 CodeHighlightStyles 按 data-theme 动态加载 */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="alternate" type="application/rss+xml" title="RSS" href="/rss.xml" />
      </head>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="classic"
          themes={[...SITE_THEME_IDS]}
          enableSystem={false}
          storageKey="knowledge-blog-theme"
        >
          <Providers>
            <SiteShell>{children}</SiteShell>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
