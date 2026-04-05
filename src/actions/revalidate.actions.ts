'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createSupabaseAdmin } from '@/lib/supabase.server';

// =========================================================================
// INTERFACES & TIPAGEM
// =========================================================================

interface GaleriaData {
  id: string;
  slug?: string;
  drive_folder_id?: string;
}

interface GalleryRevalidationData {
  galeriaId: string;
  slug?: string;
  driveFolderId?: string;
  userId: string;
  username?: string;
}

// =========================================================================
// 1. REVALIDAÇÃO DE PERFIL (CENTRALIZADA)
// =========================================================================

/**
 * Revalida o perfil em todos os níveis: público, privado e dados de cache.
 * Usa tags com userId/username para limpar apenas o cache daquele usuário.
 * Use em: Update de bio, redes sociais, configurações, mensagens ou planos.
 */
/**
 * Revalida o perfil em todos os níveis: público, privado e dados de cache.
 * Garante compatibilidade entre tags de ID e Username.
 */
export async function revalidateProfile(username: string, userId: string) {
  try {
    const cleanUsername = username.toLowerCase().trim();

    // 1. Tags de Cache Público (unstable_cache no getProfileByUsername)
    // Usamos as duas para garantir que qualquer uma definida no service seja limpa
    revalidateTag('user-profile');
    revalidateTag(`profile-${cleanUsername}`);
    revalidateTag(`profile-data-${cleanUsername}`);

    // 2. Tags de Cache Privado (unstable_cache no getProfileData)
    revalidateTag(`profile-private-${userId}`);
    revalidateTag(`user-profile-data-${userId}`);
    revalidateTag(`user_profile_${userId}`); // Tag extra de segurança

    // 3. Tags de Listagem de Galerias
    revalidateTag(`profile-galerias-${cleanUsername}`);
    revalidateTag(`user-galerias-${userId}`);

    // 4. Revalidação Física de Caminhos (Público e Dashboard)
    // O 'layout' revalida tudo que está abaixo do caminho
    revalidatePath(`/${cleanUsername}`, 'layout');
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard', 'page'); // Força a página principal do admin

    console.log(`[Revalidate] Sucesso para o usuário: ${cleanUsername}`);
    return { success: true };
  } catch (error) {
    console.error('[revalidateProfile] Erro crítico:', error);
    return { success: false };
  }
}

/**
 * Revalidação profunda: Profile + Todas as Galerias do usuário.
 * Útil após mudanças drásticas (como alteração de username ou reset de plano).
 */
export async function revalidateProfileComplete(
  supabase: any,
  username: string,
  userId: string,
) {
  try {
    // 1. Revalida o perfil base
    await revalidateProfile(username, userId);

    // 2. Busca e revalida cada galeria para limpar caches de slugs e fotos
    const { data: galerias } = await supabase
      .from('tb_galerias')
      .select('id, slug, drive_folder_id')
      .eq('user_id', userId);

    if (galerias) {
      for (const g of galerias) {
        if (g.slug) {
          revalidateTag(`gallery-${g.slug}`);
          revalidateTag(`gallery-data-${g.slug}`);
        }
        if (g.drive_folder_id) revalidateTag(`drive-${g.drive_folder_id}`);
        revalidateTag(`photos-${g.id}`);

        // Se a galeria foi arquivada, precisamos revalidar o path dela também
        revalidatePath(`/${username.toLowerCase()}/${g.slug}`, 'page');
      }
    }

    // Revalida o dashboard e a home do perfil
    revalidatePath('/dashboard', 'layout');
    revalidatePath(`/${username.toLowerCase()}`, 'layout');

    return { success: true };
  } catch (error) {
    console.error('[revalidateProfileComplete] Erro:', error);
    return { success: false };
  }
}

// =========================================================================
// 2. REVALIDAÇÃO DE GALERIAS
// =========================================================================

/**
 * Revalida uma galeria específica e sua presença nas listagens.
 */
export async function revalidateGalleryCache(data: GalleryRevalidationData) {
  const { galeriaId, slug, driveFolderId, userId, username } = data;

  try {
    if (slug) {
      revalidateTag(`gallery-${slug}`);
      revalidateTag(`gallery-data-${slug}`);
    }

    if (driveFolderId) revalidateTag(`drive-${driveFolderId}`);

    revalidateTag(`photos-${galeriaId}`);
    revalidateTag(`gallery-tags-${galeriaId}`);
    revalidateTag(`user-galerias-${userId}`);

    if (username) {
      const cleanUsername = username.toLowerCase().trim();
      revalidateTag(`profile-galerias-${cleanUsername}`);

      if (slug) revalidatePath(`/${cleanUsername}/${slug}`, 'page');
      revalidatePath(`/${cleanUsername}`, 'layout');
    }

    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (err) {
    console.error('[revalidateGalleryCache] Erro:', err);
    return { success: false };
  }
}

// =========================================================================
// 3. FOTOS E DRIVE
// =========================================================================

export async function revalidateDrivePhotos(
  folderId: string,
  galleryId?: string,
) {
  if (!folderId) return;
  revalidateTag(`drive-${folderId}`);
  if (galleryId) revalidateTag(`photos-${galleryId}`);
}

// =========================================================================
// 4. HELPERS E ADMIN
// =========================================================================

/**
 * Limpa o cache específico de um usuário: tags de perfil + listagem de galerias
 * + tags de cada galeria (slug, fotos, drive). Use após alterações manuais de
 * suporte (ex.: reativação/ocultação de galerias).
 */
/**
 * Após cobrança confirmada (webhook Asaas, etc.): invalida caches de perfil
 * usados em `profile.service.ts` (`profile-private-*`, `profile-*`,
 * `profile-data-*`, `user-profile`, listagens) e o conjunto de tags de
 * galerias em `revalidateUserCache`.
 */
export async function revalidateProfileCachesForBilling(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const { data: row } = await admin
      .from('tb_profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    const username = row?.username?.toLowerCase().trim();

    if (username) {
      await revalidateProfile(username, userId);
    } else {
      revalidateTag('user-profile');
      revalidateTag(`profile-private-${userId}`);
      revalidateTag(`user-profile-data-${userId}`);
      revalidateTag(`user_profile_${userId}`);
      revalidateTag(`user-galerias-${userId}`);
    }

    await revalidateUserCache(userId);
    revalidatePath('/dashboard/planos');
    return { success: true };
  } catch (error) {
    console.error('[revalidateProfileCachesForBilling] Erro:', error);
    return { success: false, error: String(error) };
  }
}

export async function revalidateUserCache(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    revalidateTag(`profile-private-${userId}`);
    revalidateTag(`user-profile-data-${userId}`);
    revalidateTag(`user_profile_${userId}`);
    revalidateTag(`user-galerias-${userId}`);

    const admin = createSupabaseAdmin();
    const { data: galerias } = await admin
      .from('tb_galerias')
      .select('id, slug, drive_folder_id')
      .eq('user_id', userId);

    if (galerias?.length) {
      galerias.forEach((g: GaleriaData) => {
        if (g.slug) {
          revalidateTag(`gallery-${g.slug}`);
          revalidateTag(`gallery-data-${g.slug}`);
        }
        if (g.drive_folder_id) revalidateTag(`drive-${g.drive_folder_id}`);
        revalidateTag(`photos-${g.id}`);
      });
    }

    // 1. Invalida o layout global do dashboard (onde a Sidebar reside)
    revalidatePath('/dashboard', 'layout');

    // 2. Invalida especificamente a página de assinatura para garantir dados novos na tabela
    revalidatePath('/dashboard/assinatura');

    return { success: true };
  } catch (error) {
    console.error('[revalidateUserCache] Erro:', error);
    return { success: false, error: String(error) };
  }
}

export async function getGalleryRevalidationData(
  supabase: any,
  galeriaId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('tb_galerias')
    .select('slug, drive_folder_id')
    .eq('id', galeriaId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function purgeAllCache() {
  try {
    revalidateTag('user-profile');
    revalidateTag('drive-photos');
    revalidateTag('public-profile');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch {
    return { success: false };
  }
}
