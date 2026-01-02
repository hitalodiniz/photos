import { createSupabaseServerClient } from "@/lib/supabase.server";
import { notFound } from "next/navigation";

export default async function sitemap({ params }) {
  const { username } = params;

  const supabase = createSupabaseServerClient();

  // Validar fotógrafo
  const { data: profile } = await supabase
    .from("tb_profiles")
    .select("id, username, use_subdomain")
    .eq("username", username)
    .single();

  if (!profile || !profile.use_subdomain) {
    notFound();
  }

  // Buscar galerias do fotógrafo
  const { data: galerias } = await supabase
    .from("tb_galerias")
    .select("slug, date")
    .eq("user_id", profile.id);

  const baseUrl = `${username}.${process.env.NEXT_PUBLIC_BASE_URL}`;

  return galerias.map((galeria) => ({
    url: `https://${baseUrl}/${galeria.slug}`,
    lastModified: new Date(galeria.date),
  }));
}
