'use client'

import nextDynamic from 'next/dynamic'

const SiteParticles = nextDynamic(() => import('@/components/effects/SiteParticles'), {
  ssr: false,
})

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteParticles />
      <div className="site-shell-content">{children}</div>
    </>
  )
}
