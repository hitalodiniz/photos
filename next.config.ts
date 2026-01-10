import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/proxy-image',
        search: '',
      },
    ],
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
        hostname: 'lh3.googleusercontent.com',
        pathname: '/d/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    // Resolve o erro de Cross-Origin no terminal entre hitalodiniz.lvh.me e o servidor
    serverActions: {
      allowedOrigins: [
        'hitalodiniz.lvh.me',
        'localhost:3000',
        'suagaleria.com.br',
        'www.suagaleria.com.br',
      ],
    },
  },
  eslint: {
    // Atenção: Isso permite que o build termine mesmo com erros de lint.
    ignoreDuringBuilds: true,
  },
  // Se você também tiver erros de TypeScript que quer ignorar:
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
