import { createSupabaseClientForCache } from '@/lib/supabase.server';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import { getDriveAccessTokenForUser } from '@/lib/google-auth';
import { Galeria, GaleriaRawResponse } from '@/core/types/galeria';
import {
  MAX_PHOTOS_PER_GALLERY_BY_PLAN,
  type PlanKey,
} from '@/core/config/plans';
import { unstable_cache } from 'next/cache';
import { GLOBAL_CACHE_REVALIDATE } from '../utils/url-helper';

/**
 * 1. Busca os dados brutos da galeria no Supabase
 * 🎯 CACHE: Usa unstable_cache com tag gallery-[slug] e revalidate de 30 dias
 * O cache é limpo automaticamente via revalidateTag quando a galeria é atualizada
 */
export const fetchGalleryBySlug = (fullSlug: string) =>
  unstable_cache(
    async (slugParam: string) => {
      const supabase = await createSupabaseClientForCache();
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
            message_templates,
            plan_key,         
            plan_trial_expires
          )
        `,
        )
        .eq('slug', fullSlug)
        .eq('is_deleted', false)
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
    [`gallery-data-${fullSlug}`], // 🎯 Key (estática ou baseada no param)
    {
      revalidate: GLOBAL_CACHE_REVALIDATE,
      // 🎯 Use apenas a tag do slug aqui.
      // A atualização das mensagens será feita pela revalidação do PATH ou via ID no updateProfile.
      tags: [`gallery-${fullSlug}`],
    },
  )(fullSlug); // 🎯 A chamada da função acontece aqui

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
    // 1. Espalhamos tudo o que veio do banco para não perder colunas novas
    ...(raw as any),

    // 2. Sobrescrevemos/Garantimos os campos formatados da Galeria
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    category: (raw as any).category || 'Outros',
    photo_count: raw.photo_count || 0,
    grid_bg_color: (raw as any).grid_bg_color || '#F3E5AB',

    // 3. Mapeamento do Fotógrafo (O ponto crítico)
    photographer: raw.photographer
      ? {
          // 🎯 O SEGREDO: Espalha o objeto original primeiro.
          // Isso garante que plan_key, plan_trial_expires e outros passem adiante.
          ...raw.photographer,

          // Adiciona ou sobrescreve apenas os campos calculados/específicos
          use_subdomain: hasSubdomain,
          profile_url: profileUrl,
        }
      : undefined,

    // 4. Campos de compatibilidade da UI
    photographer_name: raw.photographer?.full_name || 'Autor',
    photographer_avatar_url: raw.photographer?.profile_picture_url || null,
    photographer_username: raw.photographer?.username || username,
    use_subdomain: hasSubdomain,
    leads_count: raw.leads?.[0] ? ((raw.leads[0] as any).count ?? 0) : 0,
    gallery_tags: raw.gallery_tags || null,
    photo_tags: raw.photo_tags || null,
    selection_ids: raw.selection_ids || null,
    has_contracting_client: raw.has_contracting_client || null,
    selection_metadata: raw.selection_metadata || null,
    expires_at: raw.expires_at || null,
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
        // Plano resolvido internamente por userId (sem usuário logado)
        const planContext = { userId };

        // 🎯 TENTATIVA 1: Tenta listar sem autenticação (pasta pública)
        const publicPhotos = await listPhotosFromDriveFolder(
          folderId,
          undefined,
          planContext,
        );
        if (publicPhotos && publicPhotos.length > 0) {
          // console.log(`[fetchDrivePhotos] ✅ Listou ${publicPhotos.length} fotos de pasta pública (sem auth)`);
          return { photos: publicPhotos, error: null };
        }

        // 🎯 TENTATIVA 2: Se não funcionou, tenta com autenticação OAuth
        // Sempre chama listPhotosFromDriveFolder, mesmo sem token (undefined)
        // console.log(`[fetchDrivePhotos] API Key não retornou fotos. Tentando obter token OAuth...`);
        const token = await getDriveAccessTokenForUser(userId, {
          useServiceRole: true,
        });

        // Chama listPhotosFromDriveFolder mesmo se token for null/undefined
        // console.log(`[fetchDrivePhotos] Tentando listar com OAuth (token ${token ? 'disponível' : 'não disponível, usando API Key'})...`);
        const photos = await listPhotosFromDriveFolder(
          folderId,
          token || undefined,
          planContext,
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
      const supabase = await createSupabaseClientForCache();

      // Busca os dados da galeria para obter folderId, userId e photo_count (limite de exibição = gravado na tabela)
      const { data: galeria, error: galeriaError } = await supabase
        .from('tb_galerias')
        .select(
          `
          id, 
          drive_folder_id, 
          user_id,
          photo_count,
          photographer:tb_profiles!user_id (
            plan_key,
            plan_trial_expires
          )
        `,
        )
        .eq('id', galleryId)
        .single();

      if (galeriaError || !galeria || !galeria.drive_folder_id) {
        return { photos: [], error: 'GALLERY_NOT_FOUND' };
      }

      const photographerProfile = Array.isArray(galeria.photographer)
        ? galeria.photographer[0]
        : galeria.photographer;
      const photographerPlanKey = (
        String(photographerProfile?.plan_key ?? 'FREE').toUpperCase() as PlanKey
      );
      const maxPhotosByPlan =
        MAX_PHOTOS_PER_GALLERY_BY_PLAN[photographerPlanKey] ??
        MAX_PHOTOS_PER_GALLERY_BY_PLAN.FREE;
      const normalizedPhotoCount =
        typeof galeria.photo_count === 'number' && galeria.photo_count >= 0
          ? Math.min(galeria.photo_count, maxPhotosByPlan)
          : undefined;

      // Plano por galleryId; photoCount nunca pode ultrapassar o teto do plano.
      const planContext = {
        galleryId,
        ...(typeof normalizedPhotoCount === 'number' && {
          photoCount: normalizedPhotoCount,
        }),
      };

      try {
        // 🎯 TENTATIVA 1: Tenta listar usando API Key (pasta pública do Google Drive)
        // Esta é a estratégia prioritária - funciona SEM precisar do refresh token do criador
        // Funciona para pastas públicas compartilhadas como "Qualquer pessoa com o link"
        // console.log(`[fetchPhotosByGalleryId] Tentando acesso via API Key (pasta pública)...`);
        const publicPhotos = await listPhotosFromDriveFolder(
          galeria.drive_folder_id,
          undefined,
          planContext,
        );

        if (publicPhotos && publicPhotos.length > 0) {
          // console.log(`[fetchPhotosByGalleryId] ✅ ${publicPhotos.length} fotos encontradas via API Key`);
          return { photos: publicPhotos, error: null };
        }

        // 🎯 TENTATIVA 2: Se API Key não funcionou, tenta com OAuth
        // Sempre chama listPhotosFromDriveFolder, mesmo sem token (undefined)
        // A função listPhotosFromDriveFolder gerencia internamente a estratégia dual
        // console.log(`[fetchPhotosByGalleryId] API Key não retornou fotos. Tentando obter token OAuth...`);
        const token = await getDriveAccessTokenForUser(galeria.user_id, {
          useServiceRole: true,
        });

        // Chama listPhotosFromDriveFolder mesmo se token for null/undefined
        // A função internamente tentará API Key novamente se token não estiver disponível
        // console.log(`[fetchPhotosByGalleryId] Tentando listar com OAuth (token ${token ? 'disponível' : 'não disponível, usando API Key'})...`);
        const photos = await listPhotosFromDriveFolder(
          galeria.drive_folder_id,
          token || undefined, // Garante que seja undefined se null
          planContext,
        );

        if (photos && photos.length > 0) {
          // console.log(`[fetchPhotosByGalleryId] ✅ ${photos.length} fotos encontradas via ${token ? 'OAuth' : 'API Key'}`);
          return { photos: photos, error: null };
        }

        // console.log(`[fetchPhotosByGalleryId] Nenhuma foto encontrada após tentar ambas as estratégias (API Key e OAuth)`);

        // Retorna array vazio sem erro - a pasta pode estar vazia ou não ser acessível
        return {
          photos: photos || [],
          photographer: galeria.photographer,
          error: null,
        };
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
