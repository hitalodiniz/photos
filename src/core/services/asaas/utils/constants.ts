// src/core/services/asaas/utils/constants.ts

import type { BillingPeriod } from '@/core/types/billing';

/** Ano comercial: 30 dias/mês, sem variação por calendário */
export const COMMERCIAL_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  semiannual: 180,
  annual: 360,
} as const;

/** Idade máxima de solicitação pendente (24h) */
export const PENDING_UPGRADE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Ambiente Asaas */
export const ASAAS_API_URL =
  process.env.ASAAS_ENVIRONMENT === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
