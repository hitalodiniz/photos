import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { Galeria, DrivePhoto, GaleriaRawResponse } from '@/types/galeria';

/**
 * 1. Busca os dados brutos da galeria no Supabase
 * Garante que a relação com tb_profiles traga o campo use_subdomain
 */
export async function fetchGalleryBySlug(fullSlug: string) {
  const supabase = await createSupabaseServerClientReadOnly();

  const { data, error } = await supabase
    .from('tb_galerias')
    .select(
      `
      *,
      photographer:tb_profiles!user_id (
        id,
        full_name,
        username,
        use_subdomain,
        profile_picture_url,
        phone_contact,
        instagram_link
      )
    `,
    )
    .eq('slug', fullSlug)
    .single();

  if (error || !data) return null;
  return data as GaleriaRawResponse;
}

/**
 * 2. Transforma (Map) os dados brutos
 * ESSENCIAL: Garante que o objeto 'photographer' exista para a lógica de subdomínio funcionar
 */
export function formatGalleryData(
  raw: GaleriaRawResponse,
  username: string,
): Galeria {
  // Garantimos que use_subdomain seja um booleano real
  // Se o banco retornar null ou undefined, vira false automaticamente
  const hasSubdomain = !!raw.photographer?.use_subdomain;

  return {
    id: raw.id,
    title: raw.title,
    client_name: raw.client_name,
    date: raw.date,
    location: raw.location,
    slug: raw.slug,
    category: (raw as any).category || 'Outros',
    cover_image_url: raw.cover_image_url,
    drive_folder_id: raw.drive_folder_id,
    drive_folder_name: (raw as any).drive_folder_name || null, // Adicionado
    is_public: raw.is_public,
    password: raw.password,
    user_id: (raw as any).user_id,

    // Novos campos que o Card utiliza:
    has_contracting_client: !!(raw as any).has_contracting_client,
    client_whatsapp: (raw as any).client_whatsapp || null,

    // 🎯 O OBJETO QUE O CARD PRECISA:
    photographer: raw.photographer
      ? {
          id: raw.photographer.id,
          full_name: raw.photographer.full_name,
          username: raw.photographer.username,
          profile_picture_url: raw.photographer.profile_picture_url,
          phone_contact: raw.photographer.phone_contact,
          instagram_link: raw.photographer.instagram_link,
          use_subdomain: hasSubdomain,
        }
      : undefined,

    // Mapeamentos para compatibilidade/legado
    photographer_name: raw.photographer?.full_name || 'Fotógrafo',
    photographer_avatar_url: raw.photographer?.profile_picture_url || null,
    photographer_username: raw.photographer?.username || username,
    use_subdomain: hasSubdomain,
  };
}
/**
 * 3. Busca de fotos do Google Drive
 */
export async function fetchDrivePhotos(
  userId?: string,
  folderId?: string,
): Promise<DrivePhoto[]> {
  if (!userId || !folderId) return [];

  try {
    const token = await getDriveAccessTokenForUser(userId);
    if (!token) {
      console.warn(`[Drive] Token não encontrado para o usuário: ${userId}`);
      return [];
    }

    const photos = await listPhotosFromDriveFolder(folderId, token);
    return photos || [];
  } catch (error) {
    console.error('[Drive] Erro na integração:', error);
    return [];
  }
}
