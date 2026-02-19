import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Helper centralizado para revalidação de cache de galerias
 */

interface GalleryRevalidationData {
  galeriaId: string;
  slug?: string;
  driveFolderId?: string;
  userId: string;
  username?: string;
}

/**
 * Revalida todas as tags e paths relacionados a uma galeria
 */
export function revalidateGalleryCache(data: GalleryRevalidationData) {
  const { galeriaId, slug, driveFolderId, userId, username } = data;

  // 1. Tags da galeria específica
  if (slug) {
    revalidateTag(`gallery-${slug}`);
  }

  if (driveFolderId) {
    revalidateTag(`drive-${driveFolderId}`);
  }

  revalidateTag(`photos-${galeriaId}`);
  revalidateTag(`gallery-tags-${galeriaId}`);

  // 2. Tags do usuário
  revalidateTag(`user-galerias-${userId}`);

  // 3. Tags do perfil público
  if (username) {
    revalidateTag(`profile-${username}`);
    revalidateTag(`profile-galerias-${username}`);
  }

  // 4. Paths importantes
  revalidatePath('/dashboard');
  revalidatePath('/dashboard', 'layout');
}

/**
 * Busca slug e drive_folder_id antes de operações de update/delete
 */
export async function getGalleryRevalidationData(
  supabase: any,
  galeriaId: string,
  userId: string,
): Promise<{ slug: string | null; drive_folder_id: string | null } | null> {
  const { data, error } = await supabase
    .from('tb_galerias')
    .select('slug, drive_folder_id')
    .eq('id', galeriaId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getGalleryRevalidationData] Erro:', error);
    return null;
  }

  return data;
}
