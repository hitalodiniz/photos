// src/core/services/asaas/billing/pro-rata.ts
import { COMMERCIAL_DAYS } from '../utils/constants';
import type { BillingPeriod } from '@/core/types/billing';

export function billingPeriodToCommercialDays(
  period: string | null | undefined,
): 30 | 180 | 360 {
  const p = (period ?? 'monthly') as BillingPeriod;
  return (COMMERCIAL_DAYS[p] ?? 30) as 30 | 180 | 360;
}

/**
 * Crédito pro-rata (ano comercial 30/180/360).
 * credit = (currentAmount / totalDays) * min(remainingDays, totalDays)
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
