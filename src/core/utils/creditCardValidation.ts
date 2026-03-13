// src/components/UpgradeSheet/utils/creditCardValidation.ts

function isSandboxEnv(): boolean {
  return process.env.NEXT_PUBLIC_ASAAS_ENVIRONMENT === 'sandbox';
}

// ─── Detecção de bandeira ─────────────────────────────────────────────────────

export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'elo'
  | 'hipercard'
  | 'unknown';

export function detectBrand(number: string): CardBrand {
  const n = number.replace(/\D/g, '');
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]\d|7[01])/.test(n) || /^2720/.test(n))
    return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (
    /^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(
      n,
    )
  )
    return 'elo';
  if (/^(606282|3841)/.test(n)) return 'hipercard';
  if (/^4/.test(n)) return 'visa';
  return 'unknown';
}

export function brandLabel(brand: CardBrand): string {
  const map: Record<CardBrand, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'Amex',
    elo: 'Elo',
    hipercard: 'Hipercard',
    unknown: '',
  };
  return map[brand];
}

// CVV esperado por bandeira
function expectedCvvLength(brand: CardBrand): number {
  return brand === 'amex' ? 4 : 3;
}

// ─── Algoritmo de Luhn ────────────────────────────────────────────────────────

export function luhn(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// ─── Validações individuais ───────────────────────────────────────────────────

export function validateCardNumber(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 'Número obrigatório';
  if (digits.length < 13) return 'Número muito curto';
  if (digits.length > 19) return 'Número muito longo';
  if (isSandboxEnv()) return null; // pula Luhn no sandbox
  if (!luhn(digits)) return 'Número de cartão inválido';
  return null;
}

export function validateCardHolder(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Nome obrigatório';
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(trimmed)) return 'Apenas letras e espaços';
  if (trimmed.split(/\s+/).filter(Boolean).length < 2)
    return 'Informe nome e sobrenome';
  return null;
}

export function validateExpiryMonth(value: string): string | null {
  if (!value) return 'Mês obrigatório';
  const m = parseInt(value, 10);
  if (isNaN(m) || m < 1 || m > 12) return 'Mês inválido (01–12)';
  return null;
}

export function validateExpiryYear(value: string): string | null {
  if (!value) return 'Ano obrigatório';
  const raw =
    value.length === 2 ? 2000 + parseInt(value, 10) : parseInt(value, 10);
  const currentYear = new Date().getFullYear();
  if (isNaN(raw) || raw < currentYear || raw > currentYear + 20)
    return 'Ano inválido';
  return null;
}

export function validateExpiry(month: string, year: string): string | null {
  const m = parseInt(month, 10);
  const rawYear =
    year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
  if (!m || !rawYear) return null; // validação individual já cuida
  const now = new Date();
  const expiry = new Date(rawYear, m - 1, 1); // primeiro dia do mês de expiração
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (expiry < startOfThisMonth) return 'Cartão expirado';
  return null;
}

export function validateCvv(value: string, brand: CardBrand): string | null {
  if (!value) return 'CVV obrigatório';
  if (isSandboxEnv()) return null; // bypass de validação de comprimento em sandbox

  const expected = expectedCvvLength(brand);
  if (value.replace(/\D/g, '').length !== expected)
    return `CVV deve ter ${expected} dígitos${brand === 'amex' ? ' (Amex)' : ''}`;
  return null;
}

// ─── Validação completa ───────────────────────────────────────────────────────

export interface CardErrors {
  credit_card_holder_name?: string | null;
  credit_card_number?: string | null;
  expiry_month?: string | null;
  expiry_year?: string | null;
  expiry?: string | null; // erro combinado mês+ano
  credit_card_ccv?: string | null;
}

export function validateCreditCard(card: {
  credit_card_holder_name: string;
  credit_card_number: string;
  credit_card_expiry_month: string;
  credit_card_expiry_year: string;
  credit_card_ccv: string;
}): CardErrors {
  const brand = detectBrand(card.credit_card_number);
  return {
    credit_card_holder_name: validateCardHolder(card.credit_card_holder_name),
    credit_card_number: validateCardNumber(card.credit_card_number),
    expiry_month: validateExpiryMonth(card.credit_card_expiry_month),
    expiry_year: validateExpiryYear(card.credit_card_expiry_year),
    expiry: validateExpiry(
      card.credit_card_expiry_month,
      card.credit_card_expiry_year,
    ),
    credit_card_ccv: validateCvv(card.credit_card_ccv, brand),
  };
}

export function isCardValid(errors: CardErrors): boolean {
  return Object.values(errors).every((e) => !e);
}
