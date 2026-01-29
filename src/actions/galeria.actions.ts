// src/actions/galeria.actions.ts (ou um service de orquestração)

import { PlanKey, PERMISSIONS_BY_PLAN } from '@/core/config/plans';
import {
  getAuthAndStudioIds,
  getAuthenticatedUser,
} from '@/core/services/auth-context.service';
import { archiveExceedingGalleries } from '@/core/services/galeria.service';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { ActionResult } from 'next/dist/server/app-render/types';
import {
  revalidateUserGalerias,
  revalidateProfile,
} from './revalidate.actions';

/** 🧠 RESOLVE LIMITE DE GALERIAS */
export const resolveGalleryLimitByPlan = (planKey?: PlanKey): number => {
  // Busca no mapa de permissões usando a chave do plano
  // Fallback para o plano 'FREE' caso a chave seja inválida ou ausente
  const permissions = planKey
    ? PERMISSIONS_BY_PLAN[planKey]
    : PERMISSIONS_BY_PLAN.FREE;

  return permissions?.maxGalleries || 1;
};
/**
 * 🔄 SINCRONIZAÇÃO DE PLANO:
 * Verifica se a quantidade de galerias ativas respeita o plano atual.
 * Se houver excesso (downgrade), as mais antigas são movidas para o arquivo.
 */
export async function syncUserGalleriesAction(): Promise<ActionResult> {
  const { success, userId, profile } = await getAuthenticatedUser();
  if (!success || !userId || !profile)
    return { success: false, error: 'Não autorizado' };

  try {
    const limit = resolveGalleryLimitByPlan(profile.plan_key);
    const archivedCount = await archiveExceedingGalleries(userId, limit);

    if (archivedCount > 0) {
      // 1. Revalida a lista do Dashboard (Usa sua função userId)
      await revalidateUserGalerias(userId);

      // 2. Revalida o Perfil Público (Usa sua função username)
      // Isso limpa a tag `profile-${username}` e a rota `/${username}`
      if (profile.username) {
        await revalidateProfile(profile.username);

        // 3. Adicional: Se o usuário usa subdomínio, precisamos limpar a Home dele
        if (profile.use_subdomain && profile.username) {
          // Como sua função revalidateGallery lida com caminhos complexos,
          // aqui podemos disparar um revalidatePath direto para a home do subdomínio
          revalidatePath('/', 'layout');
        }
      }

      return {
        success: true,
        message: `${archivedCount} galerias arquivadas devido ao limite do plano ${profile.plan_key}.`,
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erro na sincronização' };
  }
}
