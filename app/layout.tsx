import type { Metadata } from 'next'
import { Crimson_Pro, Mulish, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import Providers from '@/components/providers'
import SiteShell from '@/components/layout/SiteShell'
import { SITE_THEME_IDS } from '@/lib/themes'
import { getSiteName, getSiteDescription } from '@/lib/site'
import './globals.css'

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
  display: 'swap',
})
const mulish = Mulish({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-mulish',
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

const siteName = getSiteName()
const siteDescription = getSiteDescription()

export const metadata: Metadata = {
  title: {
    template: `%s · ${siteName}`,
    default: siteName,
  },
  description: siteDescription,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    siteName,
    locale: 'zh_CN',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={`${crimsonPro.variable} ${mulish.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
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
