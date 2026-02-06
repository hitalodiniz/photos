import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { Galeria, GaleriaRawResponse } from '@/core/types/galeria';
import { unstable_cache } from 'next/cache';
import { GLOBAL_CACHE_REVALIDATE } from '../utils/url-helper';

/**
 * 1. Busca os dados brutos da galeria no Supabase
 * 🎯 CACHE: Usa unstable_cache com tag gallery-[slug] e revalidate de 30 dias
 * O cache é limpo automaticamente via revalidateTag quando a galeria é atualizada
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
          leads:tb_galeria_leads(count),
          photographer:tb_profiles!user_id (
            id,
            full_name,
            username,
            use_subdomain,
            profile_picture_url,
            phone_contact,
            instagram_link,
            google_refresh_token,
            message_templates
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
    [`gallery-data-${fullSlug}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [`gallery-${fullSlug}`],
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
  const domain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'suagaleria.com.br';
  const profileUrl = hasSubdomain
    ? `https://${raw.photographer?.username || username}.${domain}`
    : `https://${domain}/${raw.photographer?.username || username}`;

  return {
    id: raw.id,
    title: raw.title,
    client_name: raw.client_name,
    date: raw.date,
    location: raw.location,
    slug: raw.slug,
    category: (raw as any).category || 'Outros',
    cover_image_ids: raw.cover_image_ids || [],
    photo_count: raw.photo_count || 0,
    cover_image_url: raw.cover_image_url || null,
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
    leads_enabled: !!(raw as any).leads_enabled,
    leads_require_name: !!(raw as any).leads_require_name,
    leads_require_email: !!(raw as any).leads_require_email,
    leads_require_whatsapp: !!(raw as any).leads_require_whatsapp,
    lead_purpose: (raw as any).lead_purpose || null,
    rename_files_sequential: !!(raw as any).rename_files_sequential,

    photographer: raw.photographer
      ? {
          id: raw.photographer.id,
          full_name: raw.photographer.full_name,
          username: raw.photographer.username,
          profile_picture_url: raw.photographer.profile_picture_url,
          phone_contact: raw.photographer.phone_contact,
          instagram_link: raw.photographer.instagram_link,
          use_subdomain: hasSubdomain,
          profile_url: profileUrl,
          message_templates: raw.photographer.message_templates,
          plan_key: raw.photographer.plan_key, // 🎯 Essencial estar aqui!
        }
      : undefined,

    photographer_name: raw.photographer?.full_name || 'Autor',
    photographer_avatar_url: raw.photographer?.profile_picture_url || null,
    photographer_username: raw.photographer?.username || username,
    use_subdomain: hasSubdomain,
    leads_count: raw.leads?.[0] ? ((raw.leads[0] as any).count ?? 0) : 0,
  };
}

/**
 * 3. Busca de fotos do Google Drive por folderId
 * 🎯 CACHE: Usa unstable_cache com tag drive-[folderId] e revalidate de 30 dias
 * O cache é limpo automaticamente via revalidateTag quando a galeria é atualizada
 */
export const fetchDrivePhotos = (userId?: string, folderId?: string) =>
  unstable_cache(
    async () => {
      if (!userId || !folderId) return { photos: [], error: 'MISSING_PARAMS' };

      try {
        // 🎯 TENTATIVA 1: Tenta listar sem autenticação (pasta pública)
        const publicPhotos = await listPhotosFromDriveFolder(folderId);
        if (publicPhotos && publicPhotos.length > 0) {
          // console.log(`[fetchDrivePhotos] ✅ Listou ${publicPhotos.length} fotos de pasta pública (sem auth)`);
          return { photos: publicPhotos, error: null };
        }

        // 🎯 TENTATIVA 2: Se não funcionou, tenta com autenticação OAuth
        // Sempre chama listPhotosFromDriveFolder, mesmo sem token (undefined)
        // console.log(`[fetchDrivePhotos] API Key não retornou fotos. Tentando obter token OAuth...`);
        const token = await getDriveAccessTokenForUser(userId);

        // Chama listPhotosFromDriveFolder mesmo se token for null/undefined
        // console.log(`[fetchDrivePhotos] Tentando listar com OAuth (token ${token ? 'disponível' : 'não disponível, usando API Key'})...`);
        const photos = await listPhotosFromDriveFolder(
          folderId,
          token || undefined,
        );

        if (photos && photos.length > 0) {
          // console.log(`[fetchDrivePhotos] ✅ ${photos.length} fotos encontradas via ${token ? 'OAuth' : 'API Key'}`);
          return { photos: photos, error: null };
        }

        // console.log(`[fetchDrivePhotos] Nenhuma foto encontrada após tentar ambas as estratégias (API Key e OAuth)`);

        // Retorna array vazio sem erro - a pasta pode estar vazia ou não ser acessível
        return { photos: [], error: null };
      } catch (error: any) {
        if (error.message === 'PERMISSION_DENIED') {
          return { photos: [], error: 'PERMISSION_DENIED' };
        }
        return { photos: [], error: 'UNKNOWN_ERROR' };
      }
    },
    [`drive-photos-${folderId}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [`drive-${folderId}`],
    },
  )();

/**
 * 4. Busca fotos da galeria por galleryId
 * 🎯 CACHE: Usa unstable_cache com tag photos-[galleryId] e revalidate de 30 dias
 * O cache é limpo automaticamente via revalidateTag quando a galeria é atualizada
 */
export const fetchPhotosByGalleryId = (galleryId: string) =>
  unstable_cache(
    async () => {
      const supabase = createSupabaseClientForCache();

      // Busca os dados da galeria para obter folderId e userId
      const { data: galeria, error: galeriaError } = await supabase
        .from('tb_galerias')
        .select('id, drive_folder_id, user_id')
        .eq('id', galleryId)
        .single();

      if (galeriaError || !galeria || !galeria.drive_folder_id) {
        return { photos: [], error: 'GALLERY_NOT_FOUND' };
      }

      try {
        // 🎯 TENTATIVA 1: Tenta listar usando API Key (pasta pública do Google Drive)
        // Esta é a estratégia prioritária - funciona SEM precisar do refresh token do criador
        // Funciona para pastas públicas compartilhadas como "Qualquer pessoa com o link"
        // console.log(`[fetchPhotosByGalleryId] Tentando acesso via API Key (pasta pública)...`);
        const publicPhotos = await listPhotosFromDriveFolder(
          galeria.drive_folder_id,
        );

        if (publicPhotos && publicPhotos.length > 0) {
          // console.log(`[fetchPhotosByGalleryId] ✅ ${publicPhotos.length} fotos encontradas via API Key`);
          return { photos: publicPhotos, error: null };
        }

        // 🎯 TENTATIVA 2: Se API Key não funcionou, tenta com OAuth
        // Sempre chama listPhotosFromDriveFolder, mesmo sem token (undefined)
        // A função listPhotosFromDriveFolder gerencia internamente a estratégia dual
        // console.log(`[fetchPhotosByGalleryId] API Key não retornou fotos. Tentando obter token OAuth...`);
        const token = await getDriveAccessTokenForUser(galeria.user_id);

        // Chama listPhotosFromDriveFolder mesmo se token for null/undefined
        // A função internamente tentará API Key novamente se token não estiver disponível
        // console.log(`[fetchPhotosByGalleryId] Tentando listar com OAuth (token ${token ? 'disponível' : 'não disponível, usando API Key'})...`);
        const photos = await listPhotosFromDriveFolder(
          galeria.drive_folder_id,
          token || undefined, // Garante que seja undefined se null
        );

        if (photos && photos.length > 0) {
          // console.log(`[fetchPhotosByGalleryId] ✅ ${photos.length} fotos encontradas via ${token ? 'OAuth' : 'API Key'}`);
          return { photos: photos, error: null };
        }

        // console.log(`[fetchPhotosByGalleryId] Nenhuma foto encontrada após tentar ambas as estratégias (API Key e OAuth)`);

        // Retorna array vazio sem erro - a pasta pode estar vazia ou não ser acessível
        return { photos: [], error: null };
      } catch (error: any) {
        console.error('[fetchPhotosByGalleryId] Erro ao buscar fotos:', {
          error: error.message,
          stack: error.stack,
          galleryId,
        });

        // Trata apenas erros específicos que realmente impedem o acesso
        if (
          error.message?.includes('PERMISSION_DENIED') ||
          error.message === 'PERMISSION_DENIED'
        ) {
          return { photos: [], error: 'PERMISSION_DENIED' };
        }

        // TOKEN_NOT_FOUND não é mais tratado como erro - a API Key deve funcionar para pastas públicas
        // Se houver exceção, loga mas não retorna erro - pode ser pasta vazia ou temporariamente inacessível
        /* console.log('[fetchPhotosByGalleryId] Exceção capturada (não fatal):', {
          error: error.message,
          galleryId,
        }); */

        return { photos: [], error: null };
      }
    },
    [`photos-${galleryId}`],
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      tags: [`photos-${galleryId}`],
    },
  )();
