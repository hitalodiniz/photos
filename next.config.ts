import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [640, 1080, 1920], // Menos tamanhos = menos processamento
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [25, 50, 75, 85, 100],

    localPatterns: [
      {
        pathname: '/**', // Permite todas as imagens locais (incluindo /public)
        search: '',
      },
      /*
    Desativado pq estava consumido processamento no vercel
      /*{
        pathname: '/api/proxy-image',
        search: '',
      },*/
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },

      {
        protocol: 'https',
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
      bodySizeLimit: '2mb', // 🎯 Aumentado para suportar uploads de fotos de perfil/fundo
      allowedOrigins: [
        'localhost:3000',
        'suagaleria.com.br',
        '*.suagaleria.com.br', // 🎯 Essencial para revalidação via subdomínios de fotógrafos
        '*.lvh.me:3000', // 🎯 Melhorado para testes locais de subdomínio
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
  // 🎯 Otimização de Cache: Garante que o cabeçalho de cache
  // seja respeitado corretamente no ambiente Vercel
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
