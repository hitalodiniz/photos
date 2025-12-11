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
        hostname: 'bdgqiyvasucvhihaueuk.supabase.co',
        // Optional: you can specify port and pathname if needed
        // port: '',
        // pathname: '/storage/v1/object/public/profile_pictures/**',
      },
    ],
  },
};

module.exports = nextConfig;