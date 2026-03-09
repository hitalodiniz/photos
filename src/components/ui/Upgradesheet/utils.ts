'use client';

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
