// src/core/services/asaas/utils/dates.ts

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(n));
  return d;
}

export function billingPeriodToMonths(
  period: string | null | undefined,
): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

/**
 * Extrai a data de vencimento gravada nas notes pelo fluxo de upgrade gratuito.
 * Formato: "Nova data de vencimento: <ISO>".
 */
export function parseExpiryFromNotes(
  notes: string | null | undefined,
): Date | null {
  if (!notes?.trim()) return null;
  const match = notes.match(/Nova data de vencimento:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const date = new Date(match[1].trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

export function periodOrder(p: string): number {
  if (p === 'annual') return 12;
  if (p === 'semiannual') return 6;
  return 1;
}
