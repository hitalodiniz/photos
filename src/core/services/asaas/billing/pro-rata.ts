// src/core/services/asaas/billing/pro-rata.ts

import { COMMERCIAL_DAYS } from '../utils/constants';
import type { BillingPeriod } from '@/core/types/billing';

/**
 * ✅ MANTÉM ANO COMERCIAL (360 dias) para cálculo de crédito.
 *
 * Converte período de cobrança em dias comerciais.
 * Mensal = 30 dias | Semestral = 180 dias | Anual = 360 dias
 *
 * ⚠️ NÃO usar para calcular data de vencimento!
 * Para vencimento, use: addMonths(date, billingPeriodToMonths(period))
 */
export function billingPeriodToCommercialDays(
  period: string | null | undefined,
): 30 | 180 | 360 {
  const p = (period ?? 'monthly') as BillingPeriod;
  return (COMMERCIAL_DAYS[p] ?? 30) as 30 | 180 | 360;
}

/**
 * ✅ Crédito pro-rata usando ano comercial (30/180/360 dias).
 *
 * Fórmula: credit = (currentAmount / totalDays) * min(remainingDays, totalDays)
 *
 * Exemplo:
 * - Plano anual R$ 1.200
 * - Usado 90 dias de 360
 * - Restam 270 dias
 * - Crédito = (1200 / 360) * 270 = R$ 900
 */
export async function calculateProRataCredit(
  currentAmount: number,
  totalDays: 30 | 180 | 360,
  remainingDays: number,
): Promise<number> {
  if (totalDays <= 0 || remainingDays <= 0) return 0;
  return (
    Math.round(
      (currentAmount / totalDays) * Math.min(remainingDays, totalDays) * 100,
    ) / 100
  );
}
