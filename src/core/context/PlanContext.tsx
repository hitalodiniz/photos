'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  PlanKey,
  PlanPermissions,
  PERMISSIONS_BY_PLAN,
  getPlansByDomain,
  PlanInfo,
} from '@/core/config/plans';
import { Profile } from '@/core/types/profile';

interface PlanContextProps {
  planKey: PlanKey;
  permissions: PlanPermissions;
  planInfo: PlanInfo;
  isPro: boolean;
  isPremium: boolean;
  canAddMore: (feature: keyof PlanPermissions, currentCount: number) => boolean;
}

const PlanContext = createContext<PlanContextProps | undefined>(undefined);

export function PlanProvider({
  children,
  planKey: fallbackKey = 'FREE',
  profile,
}: {
  children: React.ReactNode;
  planKey?: PlanKey;
  profile?: Profile;
}) {
  /**
   * 🎯 Determinação do Plano Efetivo
   * Unifica a segurança de Trial e Assinatura em um único cálculo.
   */
  const planToUse = useMemo(() => {
    if (!profile) return fallbackKey as PlanKey;

    // 1. Se NÃO é trial, o plano do banco é absoluto (Assinante ou Free manual)
    if (!profile.is_trial) {
      return (profile.plan_key || 'FREE') as PlanKey;
    }

    // 2. Se É TRIAL, validação rigorosa de data
    if (!profile.plan_trial_expires) {
      return 'FREE'; // Bloqueia se a data estiver ausente
    }

    const expiresAt = new Date(profile.plan_trial_expires);
    const now = new Date();

    // Bloqueia se a data for inválida ou se já expirou (incluindo o exato momento agora)
    if (isNaN(expiresAt.getTime()) || now >= expiresAt) {
      return 'FREE';
    }

    // 3. Trial válido
    return (profile.plan_key || 'FREE') as PlanKey;
  }, [profile, fallbackKey]);

  /**
   * 💎 Geração dos valores do Contexto baseados no plano definido acima
   */
  const value = useMemo(() => {
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : '';
    const domainConfig = getPlansByDomain(hostname);

    // Proteção contra chaves inexistentes
    const currentKey = (
      PERMISSIONS_BY_PLAN[planToUse] ? planToUse : 'FREE'
    ) as PlanKey;
    const permissions = PERMISSIONS_BY_PLAN[currentKey];
    const planInfo = domainConfig.plans[currentKey];

    return {
      planKey: currentKey,
      permissions,
      planInfo,
      isPro: ['PRO', 'PREMIUM'].includes(currentKey),
      isPremium: currentKey === 'PREMIUM',
      canAddMore: (feature: keyof PlanPermissions, currentCount: number) => {
        const limit = permissions[feature];
        if (typeof limit === 'number') return currentCount < limit;
        if (limit === 'unlimited') return true;
        return !!limit;
      },
    };
  }, [planToUse]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context)
    throw new Error('usePlan deve ser usado dentro de um PlanProvider');
  return context;
};
