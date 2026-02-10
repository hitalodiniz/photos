/**
 * 🔄 CACHE REVALIDATION HELPER
 * Gerenciamento centralizado de revalidação de cache para perfis
 */

import { revalidateTag, revalidatePath } from 'next/cache';

interface GaleriaData {
  id: string;
  slug?: string;
  drive_folder_id?: string;
}

/**
 * Revalida todas as tags relacionadas a um perfil
 */
export function revalidateProfileTags(username: string, userId: string): void {
  // Tags do perfil (público e privado)
  revalidateTag(`profile-${username}`);
  revalidateTag(`profile-private-${userId}`);

  // Tags das galerias públicas
  revalidateTag(`profile-galerias-${username}`);
}

/**
 * Revalida tags de uma galeria específica
 */
export function revalidateGalleryTags(galeria: GaleriaData): void {
  if (galeria.slug) {
    revalidateTag(`gallery-${galeria.slug}`);
  }

  if (galeria.drive_folder_id) {
    revalidateTag(`drive-${galeria.drive_folder_id}`);
  }

  if (galeria.id) {
    revalidateTag(`photos-${galeria.id}`);
  }
}

/**
 * Revalida todas as galerias de um usuário
 */
export function revalidateUserGalleriesTags(
  galerias: GaleriaData[],
  userId: string,
): void {
  if (!galerias || galerias.length === 0) return;

  // Revalida cada galeria individualmente
  galerias.forEach((galeria) => {
    revalidateGalleryTags(galeria);
  });

  // Revalida a lista de galerias do usuário
  revalidateTag(`user-galerias-${userId}`);
}

/**
 * Revalida paths físicos do perfil
 */
export function revalidateProfilePaths(username: string): void {
  revalidatePath('/dashboard');
  revalidatePath(`/${username}`);
}

/**
 * Revalidação completa após update de perfil
 */
export async function revalidateProfileComplete(
  supabase: any,
  username: string,
  userId: string,
): Promise<void> {
  // 1. Revalida tags do perfil
  revalidateProfileTags(username, userId);

  // 2. Busca e revalida galerias
  const { data: galerias } = await supabase
    .from('tb_galerias')
    .select('id, slug, drive_folder_id')
    .eq('user_id', userId);

  if (galerias) {
    revalidateUserGalleriesTags(galerias, userId);
  }

  // 3. Revalida paths físicos
  revalidateProfilePaths(username);
}
