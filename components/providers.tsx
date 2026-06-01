'use client'

import { SessionProvider } from 'next-auth/react'
import CodeHighlightStyles from '@/components/ui/CodeHighlightStyles'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CodeHighlightStyles />
      {children}
    </SessionProvider>
  )
}
