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
  params: {
    username: string;
    slug: string[];
  };
};

export default async function UsernameGaleriaPage({ params }: UsernameGaleriaPageProps) {
  const { username, slug } = params;

  const supabase = await createSupabaseServerClientReadOnly();

  const { data: profile } = await supabase
    .from("tb_profiles")
    .select("id, username, use_subdomain")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

  const fullSlug = `${username}/${slug.join("/")}`;

  const { data: galeria } = await supabase
    .from("tb_galerias")
    .select("*")
    .eq("slug", fullSlug)
    .single<Galeria>();

  if (!galeria) {
    notFound();
  }

  // Se privada: checa senha via cookie + PasswordPrompt (como já tínhamos)
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

  // Se pública ou privada com senha válida → busca fotos no Drive
  let photos = [];
  if (galeria.drive_folder_id) {
    const accessToken = await getDriveAccessTokenForUser(profile.id);
    if (accessToken) {
      photos = await listPhotosFromDriveFolder(galeria.drive_folder_id, accessToken);
    }
  }

  return <GaleriaView galeria={galeria} photos={photos} />;
}

export async function generateMetadata({ params }: UsernameGaleriaPageProps) {
  const { username, slug } = params;
  const fullSlug = `${username}/${slug.join("/")}`;

  const supabase = await createSupabaseServerClientReadOnly();

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
