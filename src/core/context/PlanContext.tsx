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
  isLoading: boolean;
  canAddMore: (feature: keyof PlanPermissions, currentCount: number) => boolean;
  trialExpiresAt: string | null;
  /** Perfil do usuário (tb_profiles). Usado no UpgradeSheet para nome e telefone. */
  profile: Profile | undefined;
  /** E-mail do auth. Usado no UpgradeSheet (read-only). */
  email: string | null | undefined;
}

const PlanContext = createContext<PlanContextProps | undefined>(undefined);

export function PlanProvider({
  children,
  planKey,
  profile,
  email,
}: {
  children: React.ReactNode;
  planKey?: PlanKey;
  profile?: Profile;
  /** E-mail do usuário (auth). Passado pelo layout a partir de getProfileData(). */
  email?: string | null;
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

  /**
   * 🎯 CORREÇÃO DO LOADING
   * Consideramos "carregando" apenas enquanto as propriedades forem estritamente UNDEFINED.
   * Se vier NULL, significa que o servidor já respondeu (mesmo que sem dados).
   */
  const isLoading = planKey === undefined && profile === undefined;

  // 2. DETERMINAÇÃO DO PLANO (Lógica de Precedência)
  const planToUse = useMemo((): PlanKey => {
    if (profile) {
      // Isento sempre mantém o plano
      if (profile.is_exempt) {
        return (profile.plan_key || 'FREE') as PlanKey;
      }

      // LÓGICA DE TRIAL AJUSTADA
      if (profile.is_trial) {
        // Se não tem data, algo está errado, volta pra FREE
        if (!profile.plan_trial_expires) return 'FREE';

        const expiresTimestamp = new Date(profile.plan_trial_expires).getTime();
        const now = new Date().getTime();

        // Se a data for inválida ou já passou, rebaixa para FREE
        if (isNaN(expiresTimestamp) || expiresTimestamp < now) {
          return 'FREE';
        }
        
        // Se ainda não expirou, mantém o plano do trial (PRO)
        return (profile.plan_key || 'FREE') as PlanKey;
      }

      // ✅ Não-trial: usa o plano do perfil diretamente
      if (profile.plan_key) return profile.plan_key as PlanKey;
    }

    // Fallback: prop planKey (galerias públicas sem perfil)
    if (planKey) return planKey;

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

    const isTrial = profile?.is_trial ?? false;

    // Se estiver em trial, injetamos isTrial nas permissões para consumo fácil
    const finalPermissions: PlanPermissions = {
      ...permissions,
      isTrial,
    };

    return {
      planKey: currentKey,
      permissions: finalPermissions,
      planInfo,
      segment: activeSegment,
      isLoading,
      isPro: ['PRO', 'PREMIUM'].includes(currentKey),
      isPremium: currentKey === 'PREMIUM',
      canAddMore: (feature: keyof PlanPermissions, currentCount: number) => {
        const limit = permissions[feature];
        if (typeof limit === 'number') return currentCount < limit;
        return !!limit;
      },
      trialExpiresAt: profile?.plan_trial_expires ?? null,
      profile,
      email: email ?? null,
      // 🎯 Helper para facilitar o que fizemos no Avatar
      getGalleryPermission: (galeria: any, feature: keyof PlanPermissions) => {
        // Se a galeria tem uma trava específica, ela manda. Se não, manda o plano.
        if (feature === 'canFavorite' && galeria?.enable_favorites === false)
          return false;
        return permissions[feature];
      },
    };
  }, [planToUse, activeSegment, isLoading, profile, email]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context)
    throw new Error('usePlan deve ser usado dentro de um PlanProvider');
  return context;
};
