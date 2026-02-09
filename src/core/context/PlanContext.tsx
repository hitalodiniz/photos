'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  PlanKey,
  PlanPermissions,
  PERMISSIONS_BY_PLAN,
  PLANS_BY_SEGMENT, // Importado do seu plans.ts
  PlanInfo,
  SegmentType, // Certifique-se de que este tipo existe no seu core
} from '@/core/config/plans';
import { Profile } from '@/core/types/profile';

interface PlanContextProps {
  planKey: PlanKey;
  permissions: PlanPermissions;
  planInfo: PlanInfo;
  segment: SegmentType; // 🎯 Novo campo
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
  // 🎯 Estado para permitir reatividade no Cliente
  const [activeSegment, setActiveSegment] = useState<SegmentType>(
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER',
  );
  useEffect(() => {
    // Sincroniza com o ThemeSwitcher/LocalStorage no mount
    const sync = () => {
      const domSeg = document.documentElement.getAttribute(
        'data-segment',
      ) as SegmentType;
      if (domSeg) setActiveSegment(domSeg);
    };

    sync();
    window.addEventListener('segment-change', sync);
    return () => window.removeEventListener('segment-change', sync);
  }, []);

  // 2. Determinação do Plano Efetivo (Mantendo sua lógica de Trial)
  const planToUse = useMemo(() => {
    if (!profile) return fallbackKey as PlanKey;
    if (!profile.is_trial) return (profile.plan_key || 'FREE') as PlanKey;
    if (!profile.plan_trial_expires) return 'FREE';

    const expiresAt = new Date(profile.plan_trial_expires);
    const now = new Date();
    if (isNaN(expiresAt.getTime()) || now >= expiresAt) return 'FREE';

    return (profile.plan_key || 'FREE') as PlanKey;
  }, [profile, fallbackKey]);

  // 3. Geração dos valores do Contexto
  const value = useMemo(() => {
    const currentKey = (
      PERMISSIONS_BY_PLAN[planToUse] ? planToUse : 'FREE'
    ) as PlanKey;
    const permissions = PERMISSIONS_BY_PLAN[currentKey];

    // 💎 Agora o plano (Militante vs Pro) muda em tempo real no debug!
    const planInfo = PLANS_BY_SEGMENT[activeSegment][currentKey];

    return {
      planKey: currentKey,
      permissions,
      planInfo,
      segment: activeSegment, // Agora retorna corretamente para o PlanGuard
      isPro: ['PRO', 'PREMIUM'].includes(currentKey),
      isPremium: currentKey === 'PREMIUM',
      canAddMore: (feature: keyof PlanPermissions, currentCount: number) => {
        const limit = permissions[feature];
        if (typeof limit === 'number') return currentCount < limit;
        return limit === true; // Ajustado para booleano simples se necessário
      },
    };
  }, [planToUse, activeSegment]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context)
    throw new Error('usePlan deve ser usado dentro de um PlanProvider');
  return context;
};
