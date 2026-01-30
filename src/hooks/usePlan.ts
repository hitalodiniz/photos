'use client';
import { useMemo } from 'react';
import {
  getPlansByDomain,
  PERMISSIONS_BY_PLAN,
  PlanKey,
  PlanPermissions,
  SegmentType,
} from '@/core/config/plans';

/**
 * Hook lógico para gestão de planos e permissões.
 * @param planKey vindo do profile (Server Side ou Context)
 */
export function usePlan(userPlanKey?: string) {
  const planData = useMemo(() => {
    // 1. Identifica o segmento pelo domínio
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : '';
    const domainConfig = getPlansByDomain(hostname);

    // 2. Normaliza a key (Garante consistência com o Master Map)
    const currentPlanKey = (userPlanKey?.toUpperCase() as PlanKey) || 'FREE';

    // 3. Extrai permissões e infos visuais
    const permissions: PlanPermissions =
      PERMISSIONS_BY_PLAN[currentPlanKey] || PERMISSIONS_BY_PLAN.FREE;
    const planInfo = domainConfig.plans[currentPlanKey];

    return {
      segment: domainConfig.segment as SegmentType,
      theme: domainConfig.theme,
      siteName: domainConfig.name,
      planKey: currentPlanKey,
      planInfo,
      permissions,
    };
  }, [userPlanKey]);

  const canAddMore = (feature: keyof PlanPermissions, currentCount: number) => {
    const limit = planData.permissions[feature];
    if (typeof limit === 'number') return currentCount < limit;
    if (limit === 'unlimited') return true;
    return true;
  };

  return {
    ...planData,
    canAddMore,
    isPremium: planData.planKey === 'PREMIUM',
    isPro: ['PRO', 'PREMIUM'].includes(planData.planKey),
  };
}
