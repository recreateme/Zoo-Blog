import { getSiteName, getSiteDescription, HOME_NAV_LABEL } from '@/lib/site'

export default function HomeHero() {
  const siteName = getSiteName()
  const description = getSiteDescription()

  return (
    <section className="home-hero home-hero-compact">
      <p className="text-meta uppercase tracking-widest mb-1">{HOME_NAV_LABEL}</p>
      <h1 className="text-display text-2xl sm:text-3xl mb-1">{siteName}</h1>
      <p className="text-lead text-sm max-w-xl">{description}</p>
    </section>
  )
}
