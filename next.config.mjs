/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@tsparticles/react', '@tsparticles/slim', '@tsparticles/engine'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'mammoth', '@anthropic-ai/sdk', 'shiki', 'rehype-pretty-code'],
    outputFileTracingIncludes: {
      '/api/posts/import': ['./node_modules/sharp/**/*', './node_modules/@img/**/*'],
      '/*': [
        './node_modules/sharp/**/*',
        './node_modules/@img/**/*',
        './node_modules/shiki/**/*',
        './node_modules/@shikijs/**/*',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
