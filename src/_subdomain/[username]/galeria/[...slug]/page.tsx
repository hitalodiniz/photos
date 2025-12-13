import { createSupabaseServerClient } from "@/lib/supabase.server";
import { notFound } from "next/navigation";

export default async function SubdomainGaleriaPage({ params }) {
  const { username, slug } = params;

  const supabase = createSupabaseServerClient();

  // 1. Validar fotógrafo
  const { data: profile } = await supabase
    .from("tb_profiles")
    .select("id, username, use_subdomain")
    .eq("username", username)
    .single();

  if (!profile || !profile.use_subdomain) {
    notFound();
  }

  // 2. Montar slug completo
  const fullSlug = slug.join("/");

  // 3. Buscar galeria
  const { data: galeria } = await supabase
    .from("tb_galerias")
    .select("*")
    .eq("slug", fullSlug)
    .single();

  if (!galeria) {
    notFound();
  }

  return (
    <div>
      <h1>{galeria.title}</h1>
      {/* Renderize sua galeria aqui */}
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { username, slug } = params;
  const fullSlug = slug.join("/");

  const supabase = createSupabaseServerClient();

  const { data: galeria } = await supabase
    .from("tb_galerias")
    .select("title, client_name, date, cover_image_url")
    .eq("slug", fullSlug)
    .single();

  if (!galeria) return {};

  const title = `${galeria.title} | ${galeria.client_name}`;
  const description = `Galeria de fotos de ${galeria.client_name}, realizada em ${new Date(
    galeria.date
  ).toLocaleDateString("pt-BR")}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: galeria.cover_image_url ? [galeria.cover_image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: galeria.cover_image_url ? [galeria.cover_image_url] : [],
    },
  };
}
