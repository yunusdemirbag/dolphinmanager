/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
    domains: ['i.etsystatic.com', 'firebasestorage.googleapis.com'],
  },
  env: {
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
  serverExternalPackages: ['firebase-admin'],
  webpack: (config, { isServer }) => {
    // WebAssembly desteği ekle
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
}

export default nextConfig
