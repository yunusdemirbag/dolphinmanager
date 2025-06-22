/** @type {import('next').NextConfig} */
const nextConfig = {
  srcDir: 'src/',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.etsystatic.com',
      },
      {
        protocol: 'https',
        hostname: 'img.etsystatic.com',
      },
      {
        protocol: 'https',
        hostname: 'qbdzcmqcsnevzhpzdhkx.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'dolphinmanager.vercel.app',
      }
    ]
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: 'https://dolphinmanager.vercel.app',
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false,
      },
    ]
  },
  distDir: '.next',
}

export default nextConfig
