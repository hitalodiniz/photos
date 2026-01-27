'use client';
import { useMemo } from 'react';
//import { useProfile } from ''; // Supondo que você tenha esse hook
import {
  getPlansByDomain,
  PERMISSIONS_BY_PLAN,
  PlanKey,
  PlanPermissions,
  SegmentType,
} from '@/core/config/plans';

export function usePlan() {
  const { profile, loading: profileLoading } = useProfile();

  const planData = useMemo(() => {
    // 1. Identifica o segmento pelo domínio (ou usa PHOTOGRAPHER como padrão)
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : '';
    const domainConfig = getPlansByDomain(hostname);

    // 2. Pega o plano atual do usuário do banco de dados (ex: 'FREE', 'PRO')
    // Garantimos que seja um PlanKey válido
    const currentPlanKey =
      (profile?.plan_type?.toUpperCase() as PlanKey) || 'FREE';

    // 3. Extrai as permissões lógicas para este plano
    const permissions: PlanPermissions = PERMISSIONS_BY_PLAN[currentPlanKey];

    // 4. Busca as informações visuais (nome, ícone, preço) para o segmento atual
    const planInfo = domainConfig.plans[currentPlanKey];

    return {
      segment: domainConfig.segment as SegmentType,
      theme: domainConfig.theme,
      siteName: domainConfig.name,
      planKey: currentPlanKey,
      planInfo,
      permissions,
      profileLoading,
    };
  }, [profile, profileLoading]);

  /**
   * Helper rápido para verificar limites numéricos
   * @example canAddMore('maxGalleries', currentGalleriesCount)
   */
  const canAddMore = (feature: keyof PlanPermissions, currentCount: number) => {
    const limit = planData.permissions[feature];
    if (typeof limit === 'number') {
      return currentCount < limit;
    }
    return true; // Se não for número, assume que não é um limite impeditivo
  };

  return {
    ...planData,
    canAddMore,
    // Abreviações úteis para o código ficar limpo
    isPremium: planData.planKey === 'PREMIUM',
    isPro: ['PRO', 'PREMIUM'].includes(planData.planKey),
  };
}
