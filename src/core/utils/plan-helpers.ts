import {
  PlanKey,
  PERMISSIONS_BY_PLAN,
  PlanPermissions,
} from '@/core/config/plans';
import { Galeria } from '@/core/types/galeria';

/** Perfil mínimo para resolver permissões (plan_key do perfil exibido) */
export type ProfileForPermission = { plan_key?: string | null } | null | undefined;

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

/**
 * 🎯 RESOLVER DE PERMISSÕES DO PERFIL (página pública)
 * Quando o visitante não está logado, as permissões devem vir do plano do perfil exibido.
 * Uso: getProfilePermission(profile, 'profileLevel') || permissions.profileLevel
 */
export const getProfilePermission = <K extends keyof PlanPermissions>(
  profile: ProfileForPermission,
  featureKey: K,
): PlanPermissions[K] => {
  const raw = profile?.plan_key || 'FREE';
  const planKey = (PERMISSIONS_BY_PLAN[raw as PlanKey] ? raw : 'FREE') as PlanKey;
  const permissions = PERMISSIONS_BY_PLAN[planKey];
  return permissions[featureKey];
};
