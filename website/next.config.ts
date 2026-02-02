import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Next.js 16 uses Turbopack by default
  turbopack: {},
  // Exclude ssh2 from bundling (used in API routes which won't be in static export)
  serverExternalPackages: ['ssh2'],
}

export default nextConfig
