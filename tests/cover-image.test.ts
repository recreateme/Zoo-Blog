import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CoverImageError,
  persistPreparedCover,
  prepareLocalCover,
  prepareRemoteCover,
  removePreparedCover,
} from '@/lib/cover-image'

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)

const temporaryDirs: string[] = []

afterEach(async () => {
  delete process.env.PUBLIC_DIR
  await Promise.all(
    temporaryDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  )
})

describe('cover image storage', () => {
  it('converts and stores a local image under public/images/covers', async () => {
    const publicDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-cover-'))
    temporaryDirs.push(publicDir)
    process.env.PUBLIC_DIR = publicDir

    const cover = await prepareLocalCover(
      { buffer: ONE_PIXEL_PNG, mimeType: 'image/png' },
      'example-post'
    )
    expect(cover.url).toMatch(/^\/images\/covers\/example-post-[\da-f]{8}\.webp$/)

    await persistPreparedCover(cover)
    const stored = await fs.readFile(cover.absolutePath)
    expect(stored.subarray(8, 12).toString('ascii')).toBe('WEBP')

    await removePreparedCover(cover)
    await expect(fs.access(cover.absolutePath)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects unsupported local file types', async () => {
    await expect(
      prepareLocalCover({ buffer: Buffer.from('not an image'), mimeType: 'text/plain' }, 'post')
    ).rejects.toBeInstanceOf(CoverImageError)
  })

  it('blocks private remote addresses', async () => {
    await expect(prepareRemoteCover('http://127.0.0.1/cover.png', 'post')).rejects.toThrow(
      '不能指向本机或内网'
    )
  })
})
