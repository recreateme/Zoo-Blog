'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Particles, { ParticlesProvider, useParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { useTheme } from 'next-themes'
import type { ISourceOptions } from '@tsparticles/engine'

async function initParticles(engine: Parameters<typeof loadSlim>[0]) {
  await loadSlim(engine)
}

function readParticleVars() {
  if (typeof window === 'undefined') {
    return { color: '#1A8A9A', linkColor: '#1A8A9A', linkOpacity: 0.38 }
  }
  const style = getComputedStyle(document.documentElement)
  const color = style.getPropertyValue('--particle-color').trim() || '#1A8A9A'
  const linkColor = style.getPropertyValue('--particle-link-color').trim() || color
  const linkOpacity = parseFloat(style.getPropertyValue('--particle-link-opacity')) || 0.38
  return { color, linkColor, linkOpacity }
}

function SiteParticlesCanvas() {
  const { resolvedTheme } = useTheme()
  const { loaded } = useParticlesProvider()
  const [reduceMotion, setReduceMotion] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [particleVars, setParticleVars] = useState(readParticleVars)

  const refreshVars = useCallback(() => {
    setParticleVars(readParticleVars())
  }, [])

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    refreshVars()
    return () => mq.removeEventListener('change', onChange)
  }, [refreshVars])

  useEffect(() => {
    if (!mounted) return
    refreshVars()
    const t = window.setTimeout(refreshVars, 50)
    return () => window.clearTimeout(t)
  }, [resolvedTheme, mounted, refreshVars])

  const { color, linkColor, linkOpacity } = particleVars

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      detectRetina: true,
      fpsLimit: 60,
      particles: {
        number: {
          value: reduceMotion ? 28 : 80,
          density: { enable: true, width: 1100, height: 1100 },
        },
        color: { value: color },
        shape: {
          type: 'polygon',
          options: {
            polygon: { sides: 4 },
          },
        },
        rotate: {
          value: { min: 0, max: 360 },
          animation: { enable: !reduceMotion, speed: 4, sync: false },
        },
        opacity: {
          value: { min: 0.28, max: 0.62 },
        },
        size: {
          value: { min: 2, max: 4.5 },
        },
        links: {
          enable: !reduceMotion,
          distance: 150,
          color: linkColor,
          opacity: linkOpacity,
          width: 1,
        },
        move: {
          enable: true,
          speed: reduceMotion ? 0.15 : 0.55,
          direction: 'none',
          random: true,
          outModes: { default: 'bounce' },
        },
      },
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: {
            enable: !reduceMotion,
            mode: 'grab',
          },
          onClick: {
            enable: !reduceMotion,
            mode: 'push',
          },
        },
        modes: {
          grab: {
            distance: 170,
            links: { opacity: Math.min(linkOpacity + 0.25, 0.85), blink: false },
          },
          push: {
            quantity: 4,
          },
        },
      },
    }),
    [color, linkColor, linkOpacity, reduceMotion]
  )

  if (!mounted) {
    return <div className="site-particles-shell site-particles-fallback" aria-hidden />
  }

  if (reduceMotion) {
    return <div className="site-particles-shell site-particles-fallback" aria-hidden />
  }

  if (!loaded) {
    return (
      <div className="site-particles-shell site-particles-fallback site-particles-loading" aria-hidden />
    )
  }

  return (
    <div className="site-particles-shell" aria-hidden>
      <Particles
        id="site-particles"
        key={`${resolvedTheme}-${color}`}
        className="site-particles-canvas"
        style={{ width: '100%', height: '100%' }}
        options={options}
      />
      <div className="site-particles-vignette" />
    </div>
  )
}

export default function SiteParticles() {
  return (
    <ParticlesProvider init={initParticles}>
      <SiteParticlesCanvas />
    </ParticlesProvider>
  )
}
