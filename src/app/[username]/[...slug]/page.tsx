// src/app/[username]/[...slug]/page.tsx
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase.server";
import GaleriaView from "@/components/gallery/GaleriaView";
import { PasswordPrompt } from "@/components/gallery";
import { listPhotosFromDriveFolder } from "@/lib/google-drive";
import { getDriveAccessTokenForUser } from "@/lib/google-auth";
import type { Galeria } from "@/types/galeria";

type UsernameGaleriaPageProps = {
  params: Promise<{
    username: string;
    slug: string[];
  }>;
};

export default async function UsernameGaleriaPage({ params }: UsernameGaleriaPageProps) {
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join("/")}`;
  const supabase = await createSupabaseServerClientReadOnly();

  // 1. Busca os dados da galeria E os dados do fotógrafo (JOIN)
  const { data: galeriaRaw, error: galeriaError } = await supabase
    .from("tb_galerias")
    .select(`
      *,
      photographer:tb_profiles!user_id (
        id,
        full_name,
        username,
        profile_picture_url,
        phone_contact,
        instagram_link
      )
    `)
    .eq("slug", fullSlug)
    .single();

  if (galeriaError || !galeriaRaw) {
    console.error("Galeria não encontrada:", fullSlug);
    notFound();
  }

  // 2. Mapeamento para garantir que o objeto siga a interface Galeria
  const galeria: Galeria = {
    ...galeriaRaw,
    photographer_name: galeriaRaw.photographer?.full_name,
    photographer_id: galeriaRaw.photographer?.username,
    photographer_avatar_url: galeriaRaw.photographer?.profile_picture_url,
    photographer_phone: galeriaRaw.photographer?.phone_contact,
    photographer_instagram: galeriaRaw.photographer?.instagram_link,
  };

  // 3. Verificação de Privacidade e Senha
  if (!galeria.is_public) {
    const cookieStore = await cookies();
    const cookieKey = `galeria-${galeria.id}-auth`;
    const savedToken = cookieStore.get(cookieKey)?.value;

    if (!savedToken || savedToken !== galeria.password) {
      return (
        <PasswordPrompt
          galeriaTitle={galeria.title}
          galeriaId={galeria.id}
          fullSlug={fullSlug}
        />
      );
    }
  }

  // 4. Busca de fotos no Google Drive usando o ID interno do fotógrafo
  let photos: any[] = [];
  if (galeria.drive_folder_id && galeriaRaw.photographer?.id) {
    try {
      const accessToken = await getDriveAccessTokenForUser(galeriaRaw.photographer.id);
      if (accessToken) {
        photos = await listPhotosFromDriveFolder(galeria.drive_folder_id, accessToken);
      }
    } catch (error) {
      console.error("Erro ao listar fotos do Drive:", error);
    }
  }

  return <GaleriaView galeria={galeria} photos={photos} />;
}

export async function generateMetadata({ params }: UsernameGaleriaPageProps) {
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join("/")}`;
  const supabase = await createSupabaseServerClientReadOnly();

  const { data: galeria } = await supabase
    .from("tb_galerias")
    .select(`
      title, 
      client_name, 
      cover_image_url,
      photographer:tb_profiles!user_id (full_name)
    `)
    .eq("slug", fullSlug)
    .single();

  if (!galeria) return { title: "Galeria não encontrada" };

  // Metadata incluindo o nome do fotógrafo para SEO
  const photographerSuffix = galeria.photographer?.full_name ? ` by ${galeria.photographer.full_name}` : "";
  const title = `${galeria.title} | ${galeria.client_name}${photographerSuffix}`;

  return {
    title,
    description: `Galeria de fotos de ${galeria.client_name}.${photographerSuffix}`,
    openGraph: {
      images: galeria.cover_image_url ? [{ url: galeria.cover_image_url }] : [],
    },
  };
}