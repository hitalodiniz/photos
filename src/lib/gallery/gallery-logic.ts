import { createSupabaseServerClientReadOnly } from '@/lib/supabase.server';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { Galeria, DrivePhoto, GaleriaRawResponse } from '@/types/galeria';

/**
 * 1. Busca os dados brutos da galeria no Supabase
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
  return data;
}

/**
 * 2. Transforma (Map) os dados brutos no formato que a View espera
 */
export function formatGalleryData(
  raw: GaleriaRawResponse,
  username: string,
): Galeria {
  return {
    id: raw.id,
    title: raw.title,
    client_name: raw.client_name,
    date: raw.date,
    location: raw.location,
    slug: raw.slug, // Adicionei o slug que faltava no seu retorno
    cover_image_url: raw.cover_image_url,
    drive_folder_id: raw.drive_folder_id,
    is_public: raw.is_public,
    password: raw.password,

    // Mapeamento do objeto photographer completo para as interfaces novas
    photographer: raw.photographer
      ? {
          id: raw.photographer.id,
          full_name: raw.photographer.full_name,
          username: raw.photographer.username,
          profile_picture_url: raw.photographer.profile_picture_url,
          phone_contact: raw.photographer.phone_contact,
          instagram_link: raw.photographer.instagram_link,
          use_subdomain: !!raw.photographer.use_subdomain, // Garante que vira boolean true/false
        }
      : undefined,

    // Mantendo seus campos legados para não quebrar componentes antigos
    photographer_name: raw.photographer?.full_name || 'Fotógrafo',
    photographer_avatar_url: raw.photographer?.profile_picture_url || null,
    photographer_phone: raw.photographer?.phone_contact || null,
    photographer_instagram: raw.photographer?.instagram_link || null,

    // Campos extras úteis para o utilitário de URL
    photographer_username: raw.photographer?.username || username,
    use_subdomain: !!raw.photographer?.use_subdomain,
  };
}

/**
 * 3. Orquestra a busca de fotos do Google Drive com tratamento de erro
 */
export async function fetchDrivePhotos(
  userId?: string,
  folderId?: string,
): Promise<DrivePhoto[]> {
  if (!userId || !folderId) return [];

  try {
    const token = await getDriveAccessTokenForUser(userId);
    if (!token) {
      console.warn(`Token não encontrado para o usuário: ${userId}`);
      return [];
    }

    const photos = await listPhotosFromDriveFolder(folderId, token);
    return photos || [];
  } catch (error) {
    // Aqui você centraliza o log de erro do Drive
    console.error('Erro na integração com Google Drive:', error);
    return [];
  }
}
