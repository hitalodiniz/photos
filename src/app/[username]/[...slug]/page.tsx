import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase.server";
import GaleriaView from "@/components/gallery/GaleriaView";
import { PasswordPrompt } from "@/components/gallery";
import { listPhotosFromDriveFolder } from "@/lib/google-drive";
import { getDriveAccessTokenForUser } from "@/lib/google-auth";

export default async function UsernameGaleriaPage({ params }: { params: Promise<any> }) {
  // 1. Await params corretamente
  const resolvedParams = await params;
  const { username, slug } = resolvedParams;
  const fullSlug = `${username}/${slug.join("/")}`;
  
  const supabase = await createSupabaseServerClientReadOnly();

  // 2. Busca com JOIN
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

  if (galeriaError || !galeriaRaw) notFound();

  // 3. Serialização Manual: Garanta que passamos APENAS dados
  const galeriaData = {
    ...galeriaRaw,
    photographer_name: galeriaRaw.photographer?.full_name || "Fotógrafo",
    photographer_id: galeriaRaw.photographer?.username || username,
    photographer_avatar_url: galeriaRaw.photographer?.profile_picture_url || null,
    photographer_phone: galeriaRaw.photographer?.phone_contact || null,
    photographer_instagram: galeriaRaw.photographer?.instagram_link || null,
  };

  // 4. Verificação de Senha (se houver)
  if (!galeriaData.is_public) {
    const cookieStore = await cookies();
    const savedToken = (await cookieStore).get(`galeria-${galeriaData.id}-auth`)?.value;

    if (savedToken !== galeriaData.password) {
      return <PasswordPrompt galeriaTitle={galeriaData.title} galeriaId={galeriaData.id} fullSlug={fullSlug} />;
    }
  }

  // 5. Busca de fotos usando o UUID (photographer.id)
  let photos: any[] = [];
  try {
    const uuid = galeriaRaw.photographer?.id;
    if (galeriaData.drive_folder_id && uuid) {
      const token = await getDriveAccessTokenForUser(uuid);
      if (token) {
        photos = await listPhotosFromDriveFolder(galeriaData.drive_folder_id, token);
      }
    }
  } catch (e) {
    console.error("Drive Error:", e);
  }

  // Passamos objetos puros para o Client Component
  return <GaleriaView galeria={JSON.parse(JSON.stringify(galeriaData))} photos={photos} />;
}