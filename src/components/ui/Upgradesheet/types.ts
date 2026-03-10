'use client';

import type { PlanPermissions } from '@/core/config/plans';

export type Step = 'plan' | 'personal' | 'billing' | 'confirm' | 'done';

export interface PersonalData {
  whatsapp: string;
  cpfCnpj: string;
  /** Nome completo para cobrança/NF-e (pode diferir do nome do perfil). */
  fullName: string;
}

export interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface UpgradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey?: keyof PlanPermissions;
  featureName?: string;
  /** Plano pré-selecionado (ex.: ao vir da página de planos). */
  initialPlanKey?: import('@/core/config/plans').PlanKey;
}
