import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN
    ? `https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN}`
    : 'https://suagaleria.com.br';

  // 1. Páginas Estáticas (Sempre presentes)
  const staticRoutes = ['', '/login', '/planos', '/privacidade', '/termos'].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: route === '' ? 1 : 0.8,
    }),
  );

  // Nota: Rotas dinâmicas como /[username] ou /subdomain não entram aqui
  // de forma fixa. Para indexar fotógrafos, você precisaria buscar no
  // banco todos os usernames e mapeá-los aqui.

  return [...staticRoutes];
}
