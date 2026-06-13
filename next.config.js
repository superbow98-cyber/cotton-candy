/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ['ffmpeg-static'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Fix 413 untuk API Routes (/api/transcribe)
  async headers() {
    return []
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co'
      },
    ],
  },
}

module.exports = nextConfig
