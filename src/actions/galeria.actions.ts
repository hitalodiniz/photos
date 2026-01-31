// src/actions/galeria.actions.ts (ou um service de orquestração)

import { PlanKey, PERMISSIONS_BY_PLAN } from '@/core/config/plans';
import {
  getAuthAndStudioIds,
  getAuthenticatedUser,
} from '@/core/services/auth-context.service';
import {
  archiveExceedingGalleries,
  purgeOldDeletedGalleries,
} from '@/core/services/galeria.service';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ActionResult } from 'next/dist/server/app-render/types';
import {
  revalidateUserGalerias,
  revalidateProfile,
} from './revalidate.actions';
import { createInternalNotification } from '@/core/services/notification.service';

/** 🧠 RESOLVE LIMITE DE GALERIAS */
export const resolveGalleryLimitByPlan = (planKey?: string): number => {
  // Busca no mapa de permissões usando a chave do plano (Normalizada para Uppercase)
  const normalizedKey = (planKey?.toUpperCase() as PlanKey) || 'FREE';
  const permissions = PERMISSIONS_BY_PLAN[normalizedKey] || PERMISSIONS_BY_PLAN.FREE;

  return permissions?.maxGalleries || 1;
};
/**
 * 🔄 SINCRONIZAÇÃO DE PLANO:
 * Verifica se a quantidade de galerias ativas respeita o plano atual.
 * Se houver excesso (downgrade), as mais antigas são movidas para o arquivo.
 */
export async function syncUserGalleriesAction(
  oldPlanKey?: string,
): Promise<ActionResult> {
  const { success, userId, profile } = await getAuthenticatedUser();
  if (!success || !userId || !profile)
    return { success: false, error: 'Não autorizado' };

  try {
    const limit = resolveGalleryLimitByPlan(profile.plan_key);

    // Chama o service enviando os dados para o log
    const archivedCount = await archiveExceedingGalleries(userId, limit, {
      oldPlan: oldPlanKey,
      newPlan: profile.plan_key,
    });

    if (archivedCount > 0) {
      await revalidateUserGalerias(userId);
      if (profile.username) await revalidateProfile(profile.username);

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
 * Pode ser agendada para rodar uma vez por dia.
 */
export async function autoPurgeTrashAction(): Promise<ActionResult> {
  try {
    const deletedGalleries = await purgeOldDeletedGalleries();

    if (deletedGalleries.length > 0) {
      // Revalida caches de forma eficiente
      // Como podem ser múltiplos usuários, limpamos o cache global de tags se necessário
      // ou iteramos pelos usuários únicos afetados
      const uniqueUserIds = [
        ...new Set(deletedGalleries.map((g) => g.user_id)),
      ];

      for (const userId of uniqueUserIds) {
        await createInternalNotification({
          userId: userId as string,
          title: '🧹 Limpeza de Lixeira',
          message:
            'Galerias antigas foram removidas permanentemente conforme a política de 30 dias.',
          type: 'info',
          link: '/dashboard/lixeira',
        });
        revalidateTag(`user-galerias-${userId}`);
      }

      return {
        success: true,
        message: `${deletedGalleries.length} galerias antigas foram removidas permanentemente.`,
      };
    }

    return { success: true, message: 'Lixeira já está limpa.' };
  } catch (error) {
    console.error('[autoPurgeTrashAction] Erro:', error);
    return { success: false, error: 'Falha na limpeza automática.' };
  }
}
// -- Índice para acelerar a busca por galerias deletadas antigas
// CREATE INDEX IF NOT EXISTS idx_galerias_purge_lookup
// ON public.tb_galerias (is_deleted, deleted_at)
// WHERE is_deleted = true;
