import { getSiteName, getSiteDescription, HOME_NAV_LABEL } from '@/lib/site'
import { cn } from '@/lib/utils'

type HomeHeroProps = {
  variant?: 'default' | 'sidebar'
}

export default function HomeHero({ variant = 'default' }: HomeHeroProps) {
  const siteName = getSiteName()
  const description = getSiteDescription()
  const isSidebar = variant === 'sidebar'

  return (
    <section
      className={cn(
        'home-hero',
        isSidebar ? 'home-hero-sidebar' : 'home-hero-compact'
      )}
    >
      <p
        className={cn(
          'text-meta uppercase tracking-widest',
          isSidebar ? 'mb-2' : 'mb-1'
        )}
      >
        {HOME_NAV_LABEL}
      </p>
      <h1
        className={cn(
          'text-display mb-1',
          isSidebar ? 'text-xl sm:text-2xl leading-snug' : 'text-2xl sm:text-3xl'
        )}
      >
        {siteName}
      </h1>
      <p className={cn('text-lead', isSidebar ? 'text-xs leading-relaxed' : 'text-sm max-w-xl')}>
        {description}
      </p>
    </section>
  )
}
