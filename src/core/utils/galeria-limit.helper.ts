/**
 * Helper para validação de limites de galerias por plano
 */

import { PlanKey, PERMISSIONS_BY_PLAN } from '../config/plans';

export interface GalleryLimitResult {
  canCreate: boolean;
  currentCount: number;
  limit: number;
  error?: string;
}

/**
 * Verifica se o usuário pode criar mais galerias baseado no plano
 */
export async function checkGalleryLimit(
  supabase: any,
  userId: string,
  planKey: PlanKey,
): Promise<GalleryLimitResult> {
  // 1. Obtém o limite do plano
  const permissions = PERMISSIONS_BY_PLAN[planKey];
  const limit = permissions.maxGalleries;

  // 2. Conta galerias ativas
  const { count, error } = await supabase
    .from('tb_galerias')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .or('is_archived.eq.false,is_archived.is.null');

  if (error) {
    console.error('[checkGalleryLimit] Erro ao contar galerias:', error);
    throw error;
  }

  const currentCount = count || 0;
  const canCreate = currentCount < limit;

  return {
    canCreate,
    currentCount,
    limit,
    error: canCreate
      ? undefined
      : `Limite de ${limit} galerias atingido para seu plano (${planKey}). Arquive uma galeria ou faça upgrade.`,
  };
}

/**
 * Verifica se uma galeria pode ser reativada (restaurada ou desarquivada)
 */
export async function checkReactivationLimit(
  supabase: any,
  userId: string,
  planKey: PlanKey,
  galeriaId: string,
): Promise<GalleryLimitResult> {
  // 1. Busca o status atual da galeria
  const { data: current } = await supabase
    .from('tb_galerias')
    .select('is_archived, is_deleted')
    .eq('id', galeriaId)
    .single();

  // 2. Se já estava ativa, não precisa validar limite
  const wasActive = current && !current.is_archived && !current.is_deleted;

  if (wasActive) {
    return {
      canCreate: true,
      currentCount: 0,
      limit: PERMISSIONS_BY_PLAN[planKey].maxGalleries,
    };
  }

  // 3. Se estava inativa, valida o limite
  return checkGalleryLimit(supabase, userId, planKey);
}
