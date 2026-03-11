'use client';

import type { BillingPeriod } from '@/core/types/billing';
import type { UpgradePriceCalculation } from '@/core/types/billing';

export function storageLabel(gb: number): string {
  return gb >= 1_000 ? `${gb / 1_000} TB` : `${gb} GB`;
}

export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/** Apenas dígitos, grupos de 4 (máx. 16). */
export function formatCreditCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** MM (01-12). */
export function formatExpiryMonth(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 2);
  if (d.length === 0) return '';
  const n = parseInt(d, 10);
  if (d.length === 1) return n <= 1 ? d : '0' + d;
  if (n <= 0) return '01';
  if (n > 12) return '12';
  return d.padStart(2, '0');
}

/** AA ou AAAA (2 ou 4 dígitos). */
export function formatExpiryYear(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

/** CVV 3 ou 4 dígitos. */
export function formatCcv(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

/**
 * Texto de cobertura do upgrade gratuito por período: "X mensalidades", "X semestre(s)", "X ano(s)".
 * Usado em StepPlan e StepBilling para exibir "Seu saldo cobre as próximas X mensalidades" etc.
 */
export function getFreeUpgradeCoverageText(
  billingPeriod: BillingPeriod,
  calc: UpgradePriceCalculation | null,
): string {
  if (!calc?.is_free_upgrade) return '';
  const days = calc.free_upgrade_days_extended ?? 0;
  if (billingPeriod === 'monthly') {
    const n = calc.free_upgrade_months_covered ?? Math.floor(days / 30);
    return n > 1 ? `as próximas ${n} mensalidades` : 'a próxima mensalidade';
  }
  if (billingPeriod === 'semiannual') {
    const n = Math.floor(days / 180) || 1;
    return n > 1 ? `os próximos ${n} semestres` : 'o próximo semestre';
  }
  if (billingPeriod === 'annual') {
    const n = Math.floor(days / 360) || 1;
    return n > 1 ? `os próximos ${n} anos` : 'o próximo ano';
  }
  return 'o próximo ciclo';
}
