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
  // 1. Aguardar os parâmetros (Next.js 15)
  const { username, slug } = await params;

  /**
   * RECONSTRUÇÃO DO SLUG:
   * Se a URL é /hitalodiniz/2025/12/15/formatura
   * username = "hitalodiniz"
   * slug = ["2025", "12", "15", "formatura"]
   * fullSlug abaixo resultará em "hitalodiniz/2025/12/15/formatura"
   */
  const fullSlug = `${username}/${slug.join("/")}`;

  const supabase = await createSupabaseServerClientReadOnly();

  // 2. Busca o perfil do fotógrafo para obter o ID necessário para o Token do Drive
  const { data: profile } = await supabase
    .from("tb_profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (!profile) {
    console.error("Perfil não encontrado para o username:", username);
    notFound();
  }

  // 3. Busca os dados da galeria comparando com o slug completo do banco
  const { data: galeria, error: galeriaError } = await supabase
    .from("tb_galerias")
    .select("*")
    .eq("slug", fullSlug)
    .single<Galeria>();

  // Se der 404 aqui, verifique se o slug no banco inclui ou não o username no início
  if (galeriaError || !galeria) {
    console.error("Galeria não encontrada para o slug:", fullSlug);
    notFound();
  }

  // 4. Verificação de Privacidade e Senha
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

  // 5. Busca de fotos reais no Google Drive
  let photos: any[] = [];
  if (galeria.drive_folder_id) {
    try {
      const accessToken = await getDriveAccessTokenForUser(profile.id);
      if (accessToken) {
        photos = await listPhotosFromDriveFolder(galeria.drive_folder_id, accessToken);
      }
    } catch (error) {
      console.error("Erro ao listar fotos do Drive:", error);
    }
  }

  return <GaleriaView galeria={galeria} photos={photos} />;
}

// Metadata corrigido para seguir a mesma lógica de slug
export async function generateMetadata({ params }: UsernameGaleriaPageProps) {
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join("/")}`;

  const supabase = await createSupabaseServerClientReadOnly();

  const { data: galeria } = await supabase
    .from("tb_galerias")
    .select("title, client_name, date, cover_image_url")
    .eq("slug", fullSlug)
    .single();

  if (!galeria) return { title: "Galeria não encontrada" };

  const title = `${galeria.title} | ${galeria.client_name}`;
  return {
    title,
    description: `Galeria de fotos de ${galeria.client_name}.`,
    openGraph: {
      images: galeria.cover_image_url ? [{ url: galeria.cover_image_url }] : [],
    },
  };
}