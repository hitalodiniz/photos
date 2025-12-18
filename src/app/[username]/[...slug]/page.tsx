// app/[username]/galeria/[...slug]/page.tsx
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase.server";
import GaleriaView from "@/components/GaleriaView";
import { PasswordPrompt } from "@/components/PasswordPrompt";
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
  // Ajuste Next.js 15: Aguardar os parâmetros
  const { username, slug } = await params;
  const fullSlug = `${username}/${slug.join("/")}`;

  const supabase = await createSupabaseServerClientReadOnly();

  // 1. Busca o perfil para vincular ao ID do Google Auth
  const { data: profile } = await supabase
    .from("tb_profiles")
    .select("id, username")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  // 2. Busca os dados da galeria
  const { data: galeria } = await supabase
    .from("tb_galerias")
    .select("*")
    .eq("slug", fullSlug)
    .single<Galeria>();

  if (!galeria) notFound();

  // 3. Verificação de Privacidade e Senha
  if (!galeria.is_public) {
    const cookieStore = await cookies();
    const cookieKey = `galeria-${galeria.id}-auth`;
    const savedToken = cookieStore.get(cookieKey)?.value;

    // Se não houver cookie ou a senha salva estiver incorreta/desatualizada
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

  // 4. Busca de fotos reais no Google Drive
  let photos = [];
  if (galeria.drive_folder_id) {
    try {
      // Obtém token de acesso usando o ID do dono da galeria (fotógrafo)
      const accessToken = await getDriveAccessTokenForUser(profile.id);
      
      if (accessToken) {
        photos = await listPhotosFromDriveFolder(galeria.drive_folder_id, accessToken);
      }
    } catch (error) {
      console.error("Erro ao listar fotos do Drive:", error);
    }
  }

  // 5. Renderiza a visualização final com os dados reais
  return <GaleriaView galeria={galeria} photos={photos} />;
}

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
  const formattedDate = new Date(galeria.date).toLocaleDateString("pt-BR");
  const description = `Confira a galeria de ${galeria.client_name} realizada em ${formattedDate}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: galeria.cover_image_url ? [{ url: galeria.cover_image_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: galeria.cover_image_url ? [galeria.cover_image_url] : [],
    },
  };
}