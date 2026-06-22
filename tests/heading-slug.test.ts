import { describe, it, expect } from 'vitest'
import { cleanHeadingText, slugifyHeading, createHeadingSlugger } from '@/lib/heading-slug'

describe('heading-slug', () => {
  it('strips markdown formatting from heading text', () => {
    expect(cleanHeadingText('**Bold** and `code`')).toBe('Bold and code')
    expect(cleanHeadingText('[link](https://x.com)')).toBe('link')
  })

  it('generates stable slugs', () => {
    const slugger = createHeadingSlugger()
    expect(slugifyHeading('Hello World', slugger)).toBe('hello-world')
  })

  it('deduplicates repeated headings like rehype-slug', () => {
    const slugger = createHeadingSlugger()
    expect(slugifyHeading('Intro', slugger)).toBe('intro')
    expect(slugifyHeading('Intro', slugger)).toBe('intro-1')
    expect(slugifyHeading('Intro', slugger)).toBe('intro-2')
  })
})
