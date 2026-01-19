import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { Galeria, GaleriaRawResponse } from '@/core/types/galeria';
import { unstable_cache } from 'next/cache';
import { GLOBAL_CACHE_REVALIDATE } from '../utils/url-helper';

/**
 * 1. Busca os dados brutos da galeria no Supabase
 * 🎯 AJUSTE: Alterada a chave do cache para v2 para ignorar dados antigos sem token.
 */
export const fetchGalleryBySlug = (fullSlug: string) =>
  unstable_cache(
    async () => {
      const supabase = createSupabaseClientForCache();
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
            instagram_link,
            google_refresh_token
          )
        `,
        )
        .eq('slug', fullSlug)
        .single();

      if (error || !data) return null;

      const profile = data.photographer;
      const domain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'suagaleria.com.br';

      const profileUrl = profile.use_subdomain
        ? `https://${profile.username}.${domain}`
        : `https://${domain}/${profile.username}`;

      return {
        ...data,
        photographer: {
          ...profile,
          profile_url: profileUrl,
        },
      } as GaleriaRawResponse;
    },
    [`gallery-data-${fullSlug}-v2`], // 🎯 CHAVE ALTERADA para forçar novo fetch
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [`gallery-${fullSlug}`, `user-profile`], // 🎯 TAGS PARA LIMPEZA
    },
  )();

/**
 * 2. Transforma (Map) os dados brutos
 */
export function formatGalleryData(
  raw: GaleriaRawResponse,
  username: string,
): Galeria {
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
    drive_folder_name: (raw as any).drive_folder_name || null,
    is_public: raw.is_public,
    password: raw.password,
    user_id: (raw as any).user_id,
    zip_url_full: (raw as any).zip_url_full || null,
    zip_url_social: (raw as any).zip_url_social || null,
    created_at: (raw as any).created_at || new Date().toISOString(),
    updated_at: (raw as any).updated_at || new Date().toISOString(),
    has_contracting_client: !!(raw as any).has_contracting_client,
    client_whatsapp: (raw as any).client_whatsapp || null,
    is_archived: !!(raw as any).is_archived,
    is_deleted: !!(raw as any).is_deleted,
    deleted_at: (raw as any).deleted_at || null,
    show_cover_in_grid: !!(raw as any).show_cover_in_grid,
    grid_bg_color: (raw as any).grid_bg_color || '#F3E5AB',
    columns_mobile: Number((raw as any).columns_mobile) || 2,
    columns_tablet: Number((raw as any).columns_tablet) || 3,
    columns_desktop: Number((raw as any).columns_desktop) || 4,
    show_on_profile: raw.show_on_profile ?? false,

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

    photographer_name: raw.photographer?.full_name || 'Autor',
    photographer_avatar_url: raw.photographer?.profile_picture_url || null,
    photographer_username: raw.photographer?.username || username,
    use_subdomain: hasSubdomain,
  };
}

/**
 * 3. Busca de fotos do Google Drive
 * 🎯 AJUSTE: Adicionada chave v2 para limpar cache de tokens antigos/inexistentes.
 */
export const fetchDrivePhotos = (userId?: string, folderId?: string) =>
  unstable_cache(
    async () => {
      if (!userId || !folderId) return { photos: [], error: 'MISSING_PARAMS' };

      try {
        const token = await getDriveAccessTokenForUser(userId);

        if (!token) {
          console.error(
            `🚨 Falha crítica: Token não gerado para o usuário ${userId}`,
          );
          return { photos: [], error: 'TOKEN_NOT_FOUND' };
        }

        const photos = await listPhotosFromDriveFolder(folderId, token);
        return { photos: photos || [], error: null };
      } catch (error: any) {
        if (error.message === 'PERMISSION_DENIED') {
          return { photos: [], error: 'PERMISSION_DENIED' };
        }
        return { photos: [], error: 'UNKNOWN_ERROR' };
      }
    },
    [`drive-photos-${folderId}-v2`], // 🎯 CHAVE ALTERADA para forçar novo fetch
    {
      revalidate: false, // 🎯 Temporário: bypass total do cache
      tags: [`drive-${folderId}`],
    },
  )();
