'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

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
 * Use em: Update de bio, redes sociais, configurações, mensagens ou planos.
 */
export async function revalidateProfile(username: string, userId: string) {
  try {
    const cleanUsername = username.toLowerCase().trim();

    // Tags de Cache (unstable_cache)
    revalidateTag(`profile-${cleanUsername}`);
    revalidateTag(`profile-data-${cleanUsername}`); // Bate com getProfileByUsername
    revalidateTag(`profile-private-${userId}`);
    revalidateTag(`user-profile-data-${userId}`);

    // Tags de Listagem
    revalidateTag(`profile-galerias-${cleanUsername}`);
    revalidateTag(`user-galerias-${userId}`);

    // Revalidação de Rotas (Layouts e Dashboard)
    revalidatePath(`/${cleanUsername}`, 'layout'); // Atualiza templates em todas as sub-rotas
    revalidatePath('/dashboard', 'layout');

    return { success: true };
  } catch (error) {
    console.error('[revalidateProfile] Erro:', error);
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
      galerias.forEach((g: GaleriaData) => {
        if (g.slug) {
          revalidateTag(`gallery-${g.slug}`);
          revalidateTag(`gallery-data-${g.slug}`);
        }
        if (g.drive_folder_id) revalidateTag(`drive-${g.drive_folder_id}`);
        revalidateTag(`photos-${g.id}`);
      });
    }

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
