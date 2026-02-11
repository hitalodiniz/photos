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
  PLANS_BY_SEGMENT,
  PlanInfo,
  SegmentType,
} from '@/core/config/plans';
import { Profile } from '@/core/types/profile';

interface PlanContextProps {
  planKey: PlanKey;
  permissions: PlanPermissions;
  planInfo: PlanInfo;
  segment: SegmentType;
  isPro: boolean;
  isPremium: boolean;
  canAddMore: (feature: keyof PlanPermissions, currentCount: number) => boolean;
}

const PlanContext = createContext<PlanContextProps | undefined>(undefined);

export function PlanProvider({
  children,
  planKey,
  profile,
}: {
  children: React.ReactNode;
  planKey?: PlanKey;
  profile?: Profile;
}) {
  // 1. SINCRONIZAÇÃO DE SEGMENTO (Visual/Branding)
  const [activeSegment, setActiveSegment] = useState<SegmentType>(
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER',
  );

  useEffect(() => {
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

  // 2. DETERMINAÇÃO DO PLANO (Lógica de Precedência)
  const planToUse = useMemo((): PlanKey => {
    // Prioridade 1: Se houver um perfil, valida Trial e plano salvo
    // console.log('DEBUG PROVIDER:', {
    //   propPlanKey: planKey,
    //   profileObj: profile,
    // });
    if (profile) {
      // Se o perfil está marcado como Trial
      if (profile.is_trial) {
        // Caso não tenha data OU a data seja inválida OU já passou de hoje -> FREE
        if (!profile.plan_trial_expires) return 'FREE';

        const expiresAt = new Date(profile.plan_trial_expires);
        const isValidDate = !isNaN(expiresAt.getTime());
        const isNotExpired = new Date() < expiresAt;

        if (isValidDate && isNotExpired) {
          return (profile.plan_key || 'FREE') as PlanKey;
        }

        return 'FREE'; // Trial expirado ou data inválida
      }

      // Se não for trial, segue o plano assinado (ou FREE como fallback)
      return (profile.plan_key || 'FREE') as PlanKey;
    }

    // Prioridade 2: Se não houver perfil (Galeria Pública), usa o planKey passado via prop
    if (planKey) return planKey;

    // Se ambos falharem, mas o perfil existir sem a chave (erro de query)
    if (profile && !profile.plan_key) {
      console.warn('Cuidado: Perfil recebido sem plan_key!');
    }
    // Fallback Final
    return 'FREE';
  }, [profile, planKey]);

  // 3. CONSTRUÇÃO DO VALOR DO CONTEXTO
  const value = useMemo(() => {
    // Valida se a chave existe no dicionário de permissões
    const currentKey = (
      PERMISSIONS_BY_PLAN[planToUse] ? planToUse : 'FREE'
    ) as PlanKey;
    const permissions = PERMISSIONS_BY_PLAN[currentKey];

    // Busca informações de marketing baseadas no segmento (Militante vs Fotógrafo)
    const planInfo = PLANS_BY_SEGMENT[activeSegment][currentKey];

    return {
      planKey: currentKey,
      permissions,
      planInfo,
      segment: activeSegment,
      isPro: ['PRO', 'PREMIUM'].includes(currentKey),
      isPremium: currentKey === 'PREMIUM',
      canAddMore: (feature: keyof PlanPermissions, currentCount: number) => {
        const limit = permissions[feature];
        if (typeof limit === 'number') return currentCount < limit;
        return !!limit;
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
