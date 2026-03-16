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

/**
 * Valida CPF (11 dígitos, dígitos verificadores).
 * Retorna null se válido, mensagem de erro se inválido.
 */
export function validateCpf(cpf: string): string | null {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return 'CPF deve ter 11 dígitos';
  if (/^(\d)\1{10}$/.test(digits)) return 'CPF inválido';
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== parseInt(digits[9], 10)) return 'CPF inválido';
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== parseInt(digits[10], 10)) return 'CPF inválido';
  return null;
}

/**
 * Valida CNPJ (14 dígitos, dígitos verificadores).
 * Retorna null se válido, mensagem de erro se inválido.
 */
export function validateCnpj(cnpj: string): string | null {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return 'CNPJ deve ter 14 dígitos';
  if (/^(\d)\1{13}$/.test(digits)) return 'CNPJ inválido';
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i], 10) * weights1[i];
  let mod = sum % 11;
  const d1 = mod < 2 ? 0 : 11 - mod;
  if (d1 !== parseInt(digits[12], 10)) return 'CNPJ inválido';
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i], 10) * weights2[i];
  mod = sum % 11;
  const d2 = mod < 2 ? 0 : 11 - mod;
  if (d2 !== parseInt(digits[13], 10)) return 'CNPJ inválido';
  return null;
}

/**
 * Valida CPF ou CNPJ conforme quantidade de dígitos (11 = CPF, 14 = CNPJ).
 * Retorna null se válido, mensagem de erro se inválido ou incompleto.
 */
export function validateCpfCnpj(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return 'Informe CPF ou CNPJ';
  if (digits.length < 11) return 'CPF deve ter 11 dígitos';
  if (digits.length === 11) return validateCpf(value);
  if (digits.length < 14) return 'CNPJ deve ter 14 dígitos';
  return validateCnpj(value);
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
  return value.replace(/\D/g, '').slice(0, 2);
}

/** CVV 3 ou 4 dígitos. */
export function formatCcv(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

// ─── Formatação de valores e datas ────────────────────────────────────────────

/**
 * Formata número como moeda BRL.
 * Ex: 172.8 → "R$ 172,80"
 */
export function formatBRL(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Formata valor como número decimal pt-BR (sem símbolo de moeda).
 * Usado onde já há "R$" no JSX: ex "R$ {formatBRLDecimal(v)}"
 */
export function formatBRLDecimal(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata data ISO (YYYY-MM-DD ou ISO completo) em "DD/MM/YYYY".
 * Evita problemas de timezone ao fazer parse manual do segmento YYYY-MM-DD.
 */
export function formatDatePtBr(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

/**
 * Formata data ISO em extenso: "15 de janeiro de 2025".
 */
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
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
