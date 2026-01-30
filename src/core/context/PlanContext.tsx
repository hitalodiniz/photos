'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  PlanKey,
  PlanPermissions,
  PERMISSIONS_BY_PLAN,
  getPlansByDomain,
  PlanInfo,
} from '@/core/config/plans';
import { profile } from 'console';

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
  planKey = 'FREE',
}: {
  children: React.ReactNode;
  planKey: PlanKey;
}) {
  const planToUse = useMemo(() => {
    if (profile.is_trial && new Date(profile.plan_trial_expires) < new Date()) {
      return 'FREE'; // Trial expirou, volta pro Free
    }
    return profile.plan_key || 'FREE';
  }, [profile]);

  const value = useMemo(() => {
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : '';
    const domainConfig = getPlansByDomain(hostname);

    const currentKey = planKey.toUpperCase() as PlanKey;
    const permissions =
      PERMISSIONS_BY_PLAN[currentKey] || PERMISSIONS_BY_PLAN.FREE;
    const planInfo = domainConfig.plans[currentKey];

    return {
      planKey: currentKey,
      permissions,
      planInfo,
      isPro: ['PRO', 'PREMIUM'].includes(currentKey),
      isPremium: currentKey === 'PREMIUM',
      canAddMore: (feature: keyof PlanPermissions, currentCount: number) => {
        const limit = permissions[feature];
        return typeof limit === 'number' ? currentCount < limit : true;
      },
    };
  }, [planKey]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context)
    throw new Error('usePlan deve ser usado dentro de um PlanProvider');
  return context;
};
