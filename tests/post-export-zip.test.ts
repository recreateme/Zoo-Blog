import { describe, it, expect } from 'vitest'
import { extractMarkdownImageRefs } from '@/lib/post-export-zip'

describe('post-export-zip', () => {
  it('extracts markdown and html image refs', () => {
    const md = `
![](/images/a.png)
![x](../rel/b.jpg "t")
<img src="/uploads/c.webp" alt="" />
`
    expect(extractMarkdownImageRefs(md).sort()).toEqual([
      '../rel/b.jpg',
      '/images/a.png',
      '/uploads/c.webp',
    ].sort())
  })
})
