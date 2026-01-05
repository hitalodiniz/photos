export default function robots() {
  const baseUrl = process.env.BASE_URL!;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/app', '/onboarding'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
