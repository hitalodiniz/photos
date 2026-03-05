'use server';

import { getAuthenticatedUser } from '@/core/services/auth-context.service';
import {
  archiveExceedingGalleries,
  purgeOldDeletedGalleries,
  syncGaleriaPhotoCountByGaleriaId,
} from '@/core/services/galeria.service';

import { getBaseGalleriesFromPool } from '@/core/config/plans';
import {
  revalidateProfile,
  revalidateGalleryCache,
  revalidateDrivePhotos,
} from './revalidate.actions';
import { createInternalNotification } from '@/core/services/notification.service';
import { listPhotosFromDriveFolder } from '@/lib/google-drive';
import { createSupabaseAdmin } from '@/lib/supabase.server';

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * 🔄 SINCRONIZAÇÃO DE PLANO:
 * Se houver excesso, as antigas são arquivadas e o cache é renovado.
 */
export async function syncUserGalleriesAction(
  oldPlanKey?: string,
): Promise<ActionResult> {
  const { success, userId, profile } = await getAuthenticatedUser();
  if (!success || !userId || !profile)
    return { success: false, error: 'Não autorizado' };

  try {
    const limit = getBaseGalleriesFromPool(profile.plan_key);

    const archivedCount = await archiveExceedingGalleries(userId, limit, {
      oldPlan: oldPlanKey,
      newPlan: profile.plan_key,
    });

    if (archivedCount > 0) {
      // ✅ REVALIDAÇÃO CENTRALIZADA
      // Atualiza caches de listagem, perfil e rotas afetadas
      await revalidateProfile(profile.username, userId);

      return {
        success: true,
        message: `Sincronização concluída: ${archivedCount} galerias movidas para o arquivo.`,
      };
    }

    return { success: true, message: 'Seu plano está em conformidade.' };
  } catch (error: any) {
    console.error('[syncUserGalleriesAction] Erro crítico:', error);
    return { success: false, error: 'Falha ao sincronizar limites do plano.' };
  }
}

/**
 * 🤖 ACTION: Executa a limpeza automática da lixeira.
 */
export async function autoPurgeTrashAction(): Promise<ActionResult> {
  try {
    const deletedGalleries: any[] = await purgeOldDeletedGalleries();

    if (deletedGalleries.length > 0) {
      // Mapeia usuários afetados para notificação e revalidação
      const uniqueUsers: any[] = Array.from(
        new Map(deletedGalleries.map((g: any) => [g.user_id, g])).values(),
      );

      for (const user of uniqueUsers) {
        // 1. Notifica o usuário
        await createInternalNotification({
          userId: user.user_id,
          title: '🧹 Limpeza de Lixeira',
          message:
            'Galerias antigas foram removidas permanentemente conforme a política de 30 dias.',
          type: 'info',
          link: '/dashboard/lixeira',
        });

        // 2. ✅ REVALIDAÇÃO CENTRALIZADA
        // Usamos revalidateGalleryCache para cada usuário afetado (limpa listagem do admin)
        await revalidateGalleryCache({
          galeriaId: user.id, // Correção: user_id -> id
          userId: user.user_id,
          // Se tivermos o slug, ele limpa o cache ISR da página também
          slug: user.slug,
        });
      }

      return {
        success: true,
        message: `${deletedGalleries.length} galerias removidas permanentemente.`,
      };
    }

    return { success: true, message: 'Lixeira já está limpa.' };
  } catch (error) {
    console.error('[autoPurgeTrashAction] Erro:', error);
    return { success: false, error: 'Falha na limpeza automática.' };
  }
}

/**
 * 🎯 CONVERSÃO CENTRALIZADA (DE-PARA)
 * Utiliza o cache da listagem completa para extrair os nomes dos arquivos.
 * Vantagem: Zero chamadas extras ao Google se o cache estiver quente.
 */
export async function getSelectionMetadataAction(
  driveFolderId: string,
  selectedIds: string[],
  accessToken?: string,
): Promise<{ id: string; name: string }[]> {
  if (!selectedIds.length) return [];

  // Busca via listagem (aproveita cache do Next.js)
  const allPhotos = await listPhotosFromDriveFolder(driveFolderId, accessToken);
  if (!allPhotos) return [];

  const idSet = new Set(selectedIds);

  return allPhotos
    .filter((photo) => idSet.has(photo.id))
    .map((photo) => ({
      id: photo.id,
      name: photo.name,
    }));
}

export async function syncAndRevalidateGaleriaAction(
  galeriaId: string,
  driveFolderId: string,
): Promise<{ photo_count: number } | null> {
  const supabase = createSupabaseAdmin();

  // 1. Sincroniza photo_count
  const result = await syncGaleriaPhotoCountByGaleriaId(galeriaId);

  // 2. Revalida cache com dados já atualizados
  await revalidateDrivePhotos(driveFolderId, galeriaId);

  // 3. Limpa o flag
  await supabase
    .from('tb_galerias')
    .update({ needs_sync: false })
    .eq('id', galeriaId);

  return result.success && result.data
    ? { photo_count: result.data.photo_count }
    : null;
}
