'use client';

import type { ElementType } from 'react';
import { Crown, Sparkles, Zap, Rocket, Star } from 'lucide-react';
import type { PlanKey } from '@/core/config/plans';
import type { Step } from './types';

export const PLAN_ICONS: Record<PlanKey, ElementType> = {
  FREE: Zap,
  START: Rocket,
  PLUS: Star,
  PRO: Crown,
  PREMIUM: Sparkles,
};

export const STEP_ORDER: Step[] = ['plan', 'personal', 'billing', 'confirm', 'done'];

export const STEP_LABELS: Record<Step, string> = {
  plan: 'Plano',
  personal: 'Dados',
  billing: 'Pagamento',
  confirm: 'Revisar',
  done: 'Pronto',
};

export const STEP_TITLES: Record<Step, { title: string; subtitle: string }> = {
  plan: { title: 'Upgrade de Plano', subtitle: 'Escolha o plano ideal' },
  personal: {
    title: 'Dados cadastrais',
    subtitle: 'Contato e endereço de cobrança',
  },
  billing: {
    title: 'Pagamento',
    subtitle: 'Período e forma de pagamento',
  },
  confirm: { title: 'Revisar Dados', subtitle: 'Confirme antes de enviar' },
  done: { title: 'Pronto!', subtitle: 'Solicitação registrada' },
};
