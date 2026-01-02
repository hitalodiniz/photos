import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'http',
        hostname: 'googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/d/**',
      },
      {
        protocol: 'https',
        hostname: 'bdgqiyvasucvhihaueuk.supabase.co',
      },
    ],
  },
  experimental: {
    // Resolve o erro de Cross-Origin no terminal entre hitalodiniz.lvh.me e o servidor
    // @ts-ignore
    allowedDevOrigins: ['hitalodiniz.lvh.me', 'localhost:3000'],
  },
};

export default nextConfig;
