import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  env: {
    ETSY_SHOP_ID: process.env.ETSY_SHOP_ID || '12345678',
    ETSY_API_KEY: process.env.ETSY_API_KEY || '',
    ETSY_ACCESS_TOKEN: process.env.ETSY_ACCESS_TOKEN || ''
  }
};

export default nextConfig;
