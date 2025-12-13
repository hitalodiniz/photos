import { createSupabaseServerClient } from "@/lib/supabase.server";

export default async function sitemap() {
  const supabase = createSupabaseServerClient();

  // 1. Buscar todos os fotógrafos
  const { data: profiles } = await supabase
    .from("tb_profiles")
    .select("username, use_subdomain");

  // 2. Buscar todas as galerias
  const { data: galerias } = await supabase
    .from("tb_galerias")
    .select("slug, user_id");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!; // ex: https://meusite.com

  const urls = [];

  // 3. Adicionar páginas estáticas
  urls.push({
    url: `${baseUrl}/`,
    lastModified: new Date(),
  });

  // 4. Adicionar páginas de fotógrafos
  for (const profile of profiles) {
    if (!profile.use_subdomain) {
      urls.push({
        url: `${baseUrl}/${profile.username}`,
        lastModified: new Date(),
      });
    }
  }

  // 5. Adicionar galerias
  for (const galeria of galerias) {
    const profile = profiles.find((p) => p.id === galeria.user_id);

    if (!profile) continue;

    if (profile.use_subdomain) {
      urls.push({
        url: `https://${profile.username}.${baseUrl}/${galeria.slug}`,
        lastModified: new Date(),
      });
    } else {
      urls.push({
        url: `${baseUrl}/${galeria.slug}`,
        lastModified: new Date(),
      });
    }
  }

  return urls;
}

export async function sitemapProfile() {
  const supabase = createSupabaseServerClient();

  const { data: profiles } = await supabase
    .from("tb_profiles")
    .select("username, use_subdomain");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  const urls = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
    },
  ];

  // Adicionar sitemap de cada subdomínio
  for (const profile of profiles) {
    if (profile.use_subdomain) {
      urls.push({
        url: `https://${profile.username}.${baseUrl}/sitemap.xml`,
        lastModified: new Date(),
      });
    }
  }

  return urls;
}
