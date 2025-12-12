/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Domínio comum para thumbnails do Google
      },      
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',              // sem porta
        pathname: '/**',       // qualquer caminho
      },
    ],
  },
};

module.exports = nextConfig;