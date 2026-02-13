import {
  PlanKey,
  PERMISSIONS_BY_PLAN,
  PlanPermissions,
} from '@/core/config/plans';
import { Galeria } from '@/core/types/galeria';

/**
 * 🎯 RESOLVER DE PERMISSÕES DA GALERIA
 * Busca o valor de qualquer recurso baseado no plano do dono da galeria.
 */
export const getGalleryPermission = <K extends keyof PlanPermissions>(
  galeria: Galeria,
  featureKey: K,
): PlanPermissions[K] => {
  // 1. Recupera a chave do plano do fotógrafo (dono da galeria)
  const photographerPlanKey = (galeria.photographer?.plan_key ||
    'FREE') as PlanKey;

  // 2. Consulta as permissões deste plano no mapa mestre
  const permissions = PERMISSIONS_BY_PLAN[photographerPlanKey];

  // 3. Retorna o valor configurado para aquele recurso
  return permissions[featureKey];
};
