// src/components/UpgradeSheet/utils/creditCardValidation.spec.ts
/**
 * Testes unitários de creditCardValidation.
 *
 * Cobertura:
 *  A. detectBrand — prefixos de cada bandeira
 *  B. luhn — números válidos e inválidos
 *  C. validateCardNumber — campo obrigatório, curto, Luhn, sandbox bypass
 *  D. validateCardHolder — obrigatório, nome único, nome válido
 *  E. validateExpiryMonth / validateExpiryYear
 *  F. validateExpiry — mês+ano combinados (passado, presente, futuro)
 *  G. validateCvv — 3 dígitos, Amex 4, sandbox bypass
 *  H. validateCreditCard + isCardValid — integração
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Importação lazy para permitir stubEnv antes
const {
  detectBrand,
  validateCardNumber,
  validateCardHolder,
  validateExpiryMonth,
  validateExpiryYear,
  validateExpiry,
  validateCvv,
  validateCreditCard,
  isCardValid,
} = await import('@/core/utils/creditCardValidation');

afterEach(() => {
  vi.unstubAllEnvs();
});

// ═══════════════════════════════════════════════════════════════════════════════
// A. detectBrand
// ═══════════════════════════════════════════════════════════════════════════════

describe('detectBrand', () => {
  it('4111111111111111 → visa', () =>
    expect(detectBrand('4111111111111111')).toBe('visa'));
  it('4 → visa (prefixo)', () => expect(detectBrand('4')).toBe('visa'));

  it('5162306219378829 → mastercard', () =>
    expect(detectBrand('5162306219378829')).toBe('mastercard'));
  it('5100 → mastercard', () => expect(detectBrand('5100')).toBe('mastercard'));
  it('5500 → mastercard', () => expect(detectBrand('5500')).toBe('mastercard'));
  it('2221 → mastercard (faixa 2xxx)', () =>
    expect(detectBrand('2221')).toBe('mastercard'));
  it('2720 → mastercard (faixa 2xxx)', () =>
    expect(detectBrand('2720')).toBe('mastercard'));

  it('378282246310005 → amex', () =>
    expect(detectBrand('378282246310005')).toBe('amex'));
  it('34 → amex', () => expect(detectBrand('34')).toBe('amex'));
  it('37 → amex', () => expect(detectBrand('37')).toBe('amex'));

  it('6363680 → elo', () => expect(detectBrand('6363680')).toBe('elo'));
  it('4011780 → elo', () => expect(detectBrand('4011780')).toBe('elo'));

  it('6062826 → hipercard', () =>
    expect(detectBrand('6062826')).toBe('hipercard'));

  it('9999999999999999 → unknown', () =>
    expect(detectBrand('9999999999999999')).toBe('unknown'));
  it('string vazia → unknown', () => expect(detectBrand('')).toBe('unknown'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. validateCardNumber — sandbox OFF (produção)
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCardNumber — produção', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_ASAAS_ENVIRONMENT', 'production'));

  it('vazio → erro obrigatório', () => {
    expect(validateCardNumber('')).not.toBeNull();
  });

  it('menos de 13 dígitos → erro "muito curto"', () => {
    expect(validateCardNumber('411111111')).toMatch(/curto/i);
  });

  it('Luhn inválido → erro', () => {
    expect(validateCardNumber('4111111111111112')).not.toBeNull(); // dígito verificador errado
  });

  it('4111111111111111 (Luhn válido, Visa) → null', () => {
    expect(validateCardNumber('4111111111111111')).toBeNull();
  });

  it('5162306219378829 (Luhn válido, MC) → null', () => {
    expect(validateCardNumber('5162306219378829')).toBeNull();
  });

  it('aceita número com espaços/hífens (mascara formatada)', () => {
    expect(validateCardNumber('4111 1111 1111 1111')).toBeNull();
  });
});

describe('validateCardNumber — sandbox bypass', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_ASAAS_ENVIRONMENT', 'sandbox'));

  it('Luhn inválido em sandbox → null (bypass)', () => {
    expect(validateCardNumber('4111111111111112')).toBeNull();
  });

  it('número qualquer ≥ 13 dígitos em sandbox → null', () => {
    expect(validateCardNumber('1234567890123')).toBeNull();
  });

  it('vazio ainda retorna erro mesmo em sandbox', () => {
    expect(validateCardNumber('')).not.toBeNull();
  });

  it('muito curto ainda retorna erro em sandbox', () => {
    expect(validateCardNumber('12345')).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. validateCardHolder
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCardHolder', () => {
  it('vazio → erro obrigatório', () =>
    expect(validateCardHolder('')).not.toBeNull());
  it('nome único (sem sobrenome) → erro', () =>
    expect(validateCardHolder('João')).not.toBeNull());
  it('nome com espaços só → erro', () =>
    expect(validateCardHolder('   ')).not.toBeNull());
  it('"João Silva" → null', () =>
    expect(validateCardHolder('João Silva')).toBeNull());
  it('"Maria da Silva Santos" → null', () =>
    expect(validateCardHolder('Maria da Silva Santos')).toBeNull());
  it('case-insensitive: "JOAO SILVA" → null', () =>
    expect(validateCardHolder('JOAO SILVA')).toBeNull());
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. validateExpiryMonth / validateExpiryYear
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateExpiryMonth', () => {
  it('vazio → erro', () => expect(validateExpiryMonth('')).not.toBeNull());
  it('"0" → erro', () => expect(validateExpiryMonth('0')).not.toBeNull());
  it('"13" → erro', () => expect(validateExpiryMonth('13')).not.toBeNull());
  it('"1" → null', () => expect(validateExpiryMonth('1')).toBeNull());
  it('"01" → null', () => expect(validateExpiryMonth('01')).toBeNull());
  it('"12" → null', () => expect(validateExpiryMonth('12')).toBeNull());
});

describe('validateExpiryYear', () => {
  const currentYear = new Date().getFullYear();

  it('vazio → erro', () => expect(validateExpiryYear('')).not.toBeNull());
  it('ano passado → erro', () =>
    expect(validateExpiryYear(String(currentYear - 1))).not.toBeNull());
  it('ano atual → null', () =>
    expect(validateExpiryYear(String(currentYear))).toBeNull());
  it('ano futuro → null', () =>
    expect(validateExpiryYear(String(currentYear + 5))).toBeNull());
  it('2 dígitos aceitos (28 → 2028) → null', () =>
    expect(validateExpiryYear('28')).toBeNull());
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. validateExpiry
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateExpiry', () => {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1);
  const currentYear = String(now.getFullYear());
  const nextYear = String(now.getFullYear() + 1);
  const pastYear = String(now.getFullYear() - 1);

  it('mês e ano passados → erro', () => {
    expect(validateExpiry('1', pastYear)).not.toBeNull();
  });

  it('mês passado, ano atual → erro', () => {
    const pastMonth = now.getMonth() === 0 ? '12' : String(now.getMonth()); // mês anterior
    if (now.getMonth() > 0) {
      expect(validateExpiry(pastMonth, currentYear)).not.toBeNull();
    }
  });

  it('mês e ano atuais → null (ainda válido)', () => {
    expect(validateExpiry(currentMonth, currentYear)).toBeNull();
  });

  it('mês atual + próximo ano → null', () => {
    expect(validateExpiry(currentMonth, nextYear)).toBeNull();
  });

  it('mês 12 + próximo ano → null', () => {
    expect(validateExpiry('12', nextYear)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. validateCvv
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCvv — produção', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_ASAAS_ENVIRONMENT', 'production'));

  it('vazio → erro', () => expect(validateCvv('', 'visa')).not.toBeNull());
  it('"12" (2 dígitos, visa) → erro', () =>
    expect(validateCvv('12', 'visa')).not.toBeNull());
  it('"1234" (4 dígitos, visa) → erro (visa espera 3)', () =>
    expect(validateCvv('1234', 'visa')).not.toBeNull());
  it('"123" (3 dígitos, visa) → null', () =>
    expect(validateCvv('123', 'visa')).toBeNull());
  it('"123" (3 dígitos, mastercard) → null', () =>
    expect(validateCvv('123', 'mastercard')).toBeNull());
  it('"123" (3 dígitos, amex) → erro (amex espera 4)', () =>
    expect(validateCvv('123', 'amex')).not.toBeNull());
  it('"1234" (4 dígitos, amex) → null', () =>
    expect(validateCvv('1234', 'amex')).toBeNull());
  it('"12345" (5 dígitos, amex) → erro', () =>
    expect(validateCvv('12345', 'amex')).not.toBeNull());
});

describe('validateCvv — sandbox bypass', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_ASAAS_ENVIRONMENT', 'sandbox'));

  it('CVV de 2 dígitos em sandbox → null (bypass comprimento)', () => {
    expect(validateCvv('12', 'visa')).toBeNull();
  });

  it('CVV de 4 dígitos, visa, sandbox → null', () => {
    expect(validateCvv('1234', 'visa')).toBeNull();
  });

  it('CVV vazio ainda retorna erro em sandbox', () => {
    expect(validateCvv('', 'visa')).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// H. validateCreditCard + isCardValid
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCreditCard + isCardValid', () => {
  const currentYear = String(new Date().getFullYear() + 2);
  const validCard = {
    credit_card_number: '4111111111111111',
    credit_card_holder_name: 'João Silva',
    credit_card_expiry_month: '12',
    credit_card_expiry_year: currentYear,
    credit_card_ccv: '123',
  };

  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_ASAAS_ENVIRONMENT', 'production'));

  it('cartão completamente válido → isCardValid=true, todos os erros null', () => {
    const errors = validateCreditCard(validCard);
    expect(isCardValid(errors)).toBe(true);
    expect(errors.credit_card_number).toBeNull();
    expect(errors.credit_card_holder_name).toBeNull();
    expect(errors.expiry_month).toBeNull();
    expect(errors.expiry_year).toBeNull();
    expect(errors.credit_card_ccv).toBeNull();
  });

  it('número inválido → isCardValid=false, errors.number preenchido', () => {
    const errors = validateCreditCard({
      ...validCard,
      credit_card_number: '4111111111111112',
    });
    expect(isCardValid(errors)).toBe(false);
    expect(errors.credit_card_number).not.toBeNull();
  });

  it('holder inválido (nome único) → isCardValid=false', () => {
    const errors = validateCreditCard({
      ...validCard,
      credit_card_holder_name: 'João',
    });
    expect(isCardValid(errors)).toBe(false);
    expect(errors.credit_card_holder_name).not.toBeNull();
  });

  it('CVV curto para Visa → isCardValid=false', () => {
    const errors = validateCreditCard({
      ...validCard,
      credit_card_ccv: '12',
    });
    expect(isCardValid(errors)).toBe(false);
    expect(errors.credit_card_ccv).not.toBeNull();
  });

  it('cartão Amex com CVV 4 dígitos → isCardValid=true', () => {
    const errors = validateCreditCard({
      credit_card_number: '378282246310005',
      credit_card_holder_name: 'Maria Silva',
      credit_card_expiry_month: '12',
      credit_card_expiry_year: currentYear,
      credit_card_ccv: '1234',
    });
    expect(isCardValid(errors)).toBe(true);
  });

  it('múltiplos erros → isCardValid=false, errors contém todos os problemas', () => {
    const errors = validateCreditCard({
      credit_card_number: '',
      credit_card_holder_name: '',
      credit_card_expiry_month: '0',
      credit_card_expiry_year: '2000',
      credit_card_ccv: '',
    });
    expect(isCardValid(errors)).toBe(false);
    expect(errors.credit_card_number).not.toBeNull();
    expect(errors.credit_card_holder_name).not.toBeNull();
    expect(errors.credit_card_ccv).not.toBeNull();
  });
});
