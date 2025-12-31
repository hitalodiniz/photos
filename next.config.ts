import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpilação necessária para evitar o erro de SyntaxError no CSS da biblioteca
  transpilePackages: ['lightgallery'],
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
      },
      {
        protocol: 'https',
        hostname: 'bdgqiyvasucvhihaueuk.supabase.co',
      },
    ],
  },
};

export default nextConfig;
