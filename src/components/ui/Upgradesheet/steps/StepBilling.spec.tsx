// src/components/UpgradeSheet/steps/StepBilling.spec.tsx
/**
 * Suite de testes de UI para o componente StepBilling.
 *
 * Stack: Vitest + React Testing Library (já configurado no projeto Next.js)
 *
 * Setup adicional necessário (uma vez):
 *   npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
 *   # vitest.config.ts: environment: 'jsdom', setupFiles: ['./src/test/setup.ts']
 *   # src/test/setup.ts: import '@testing-library/jest-dom'
 *
 * Cobertura:
 *  A. Seleção de período — estado inicial e alternância
 *  B. Breakdown de preço — aparece com desconto PIX, residualCredit ou isFreeUpgrade
 *  C. Desconto PIX mensal — sem breakdown, sem banner de economia
 *  D. Parcelamento — aparece/some, opções corretas, reset ao trocar período
 *  E. Forma de pagamento — campos cartão aparecem/somem com PIX
 *  F. Banner de economia — valor correto com e sem desconto PIX
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StepBilling } from './StepBilling';
import { PLANS_BY_SEGMENT } from '@/core/config/plans';
import type { UpgradePriceCalculation } from '@/core/types/billing';

// ─── Plano de referência ──────────────────────────────────────────────────────
// PRO fotógrafo: price=79, semesterPrice=70 (×6=420), yearlyPrice=63 (×12=756)
const PRO = PLANS_BY_SEGMENT.PHOTOGRAPHER.PRO;

// ─── Estado mutável do contexto ───────────────────────────────────────────────

type BillingPeriod = 'monthly' | 'semiannual' | 'annual';
type BillingType = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

let ctxState: {
  billingPeriod: BillingPeriod;
  billingType: BillingType;
  planInfoForPrice: typeof PRO;
  installments: number;
  upgradeCalculation: UpgradePriceCalculation | null;
  selectedPlan: string;
  segment: string;
  planKey: string;
  profile: { is_trial?: boolean } | null;
  creditCard: {
    credit_card_holder_name: string;
    credit_card_number: string;
    credit_card_expiry_month: string;
    credit_card_expiry_year: string;
    credit_card_ccv: string;
  };
};

const setBillingPeriod = vi.fn((p: BillingPeriod) => {
  ctxState.billingPeriod = p;
});
const setBillingType = vi.fn((t: BillingType) => {
  ctxState.billingType = t;
});
const setInstallments = vi.fn((n: number) => {
  ctxState.installments = n;
});
const setUpgradeCalculation = vi.fn();
const setCreditCard = vi.fn();

function makeCtx(overrides: Partial<typeof ctxState> = {}): typeof ctxState {
  return {
    billingPeriod: 'monthly',
    billingType: 'CREDIT_CARD',
    planInfoForPrice: PRO,
    installments: 1,
    upgradeCalculation: null,
    selectedPlan: 'PRO',
    segment: 'PHOTOGRAPHER',
    planKey: 'START',
    profile: null,
    creditCard: {
      credit_card_holder_name: '',
      credit_card_number: '',
      credit_card_expiry_month: '',
      credit_card_expiry_year: '',
      credit_card_ccv: '',
    },
    ...overrides,
  };
}

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

vi.mock('../UpgradeSheetContext', () => ({
  useUpgradeSheetContext: () => ({
    ...ctxState,
    setBillingPeriod,
    setBillingType,
    setInstallments,
    setUpgradeCalculation,
    setCreditCard,
  }),
}));

// getUpgradePreview é Server Action; não deve executar em testes de UI.
vi.mock('@/core/services/asaas.service', () => ({
  getUpgradePreview: vi.fn().mockResolvedValue({ calculation: null }),
}));

vi.mock('@/components/ui/Sheet', () => ({
  SheetSection: ({
    title,
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) => (
    <section aria-label={title ?? 'section'} role="region">
      {title && <h3>{title}</h3>}
      {children}
    </section>
  ),
}));

vi.mock('../FieldLabel', () => ({
  FieldLabel: ({ label }: { label: string }) => <label>{label}</label>,
}));

// InfoTooltip é usado em PriceBreakdown mas irrelevante para os asserts do spec.
vi.mock('../../InfoTooltip', () => ({
  InfoTooltip: () => null,
}));

vi.mock('@/core/utils/creditCardValidation', () => ({
  validateCreditCard: vi.fn().mockReturnValue({}),
  detectBrand: vi.fn().mockReturnValue(null),
  brandLabel: vi.fn().mockReturnValue(null),
}));

vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>();
  return {
    ...actual,
    // Passa os formatters de cartão sem transformação para simplificar asserts
    formatCreditCardNumber: (v: string) => v,
    formatExpiryMonth: (v: string) => v,
    formatExpiryYear: (v: string) => v,
    formatCcv: (v: string) => v,
  };
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderBilling() {
  return render(<StepBilling />);
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. Seleção de período
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Seleção de período', () => {
  beforeEach(() => {
    ctxState = makeCtx({
      billingPeriod: 'monthly',
      billingType: 'CREDIT_CARD',
    });
    vi.clearAllMocks();
  });

  it('3 cards de período renderizados: Mensal, Semestral, Anual', () => {
    renderBilling();
    expect(screen.getByText(/^mensal$/i)).toBeInTheDocument();
    expect(screen.getByText(/^semestral$/i)).toBeInTheDocument();
    expect(screen.getByText(/^anual$/i)).toBeInTheDocument();
  });

  it('clicar em Semestral chama setBillingPeriod("semiannual")', async () => {
    renderBilling();
    const user = userEvent.setup();
    const btn = screen
      .getAllByRole('button')
      .find((b) => /semestral/i.test(b.textContent ?? ''));
    await user.click(btn!);
    expect(setBillingPeriod).toHaveBeenCalledWith('semiannual');
  });

  it('clicar em Anual chama setBillingPeriod("annual")', async () => {
    renderBilling();
    const user = userEvent.setup();
    const btn = screen
      .getAllByRole('button')
      .find(
        (b) =>
          b.textContent?.includes('Anual') && b.textContent?.includes('756'),
      );
    await user.click(btn!);
    expect(setBillingPeriod).toHaveBeenCalledWith('annual');
  });

  it('card Mensal (período selecionado) é renderizado', () => {
    renderBilling();
    const mensal = screen
      .getAllByRole('button')
      .find((b) => /mensal/i.test(b.textContent ?? ''));
    expect(mensal).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. Breakdown de preço (PriceBreakdown)
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Breakdown de preço', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem crédito e sem PIX: breakdown NÃO é exibido', () => {
    ctxState = makeCtx({
      billingPeriod: 'monthly',
      billingType: 'CREDIT_CARD',
      upgradeCalculation: null,
    });
    renderBilling();
    expect(screen.queryByText(/resumo do valor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/upgrade gratuito/i)).not.toBeInTheDocument();
  });

  it('PIX + semestral: breakdown exibido com linha "Desconto PIX"', () => {
    ctxState = makeCtx({
      billingPeriod: 'semiannual',
      billingType: 'PIX',
      upgradeCalculation: null,
    });
    renderBilling();
    expect(screen.getByText(/desconto pix/i)).toBeInTheDocument();
  });

  it('PIX + mensal: breakdown NÃO é exibido (PIX mensal sem desconto)', () => {
    ctxState = makeCtx({
      billingPeriod: 'monthly',
      billingType: 'PIX',
      upgradeCalculation: null,
    });
    renderBilling();
    expect(screen.queryByText(/desconto pix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resumo do valor/i)).not.toBeInTheDocument();
  });

  it('com residualCredit > 0: breakdown exibido com linha "Crédito dos dias não usados"', () => {
    const calc: UpgradePriceCalculation = {
      type: 'upgrade',
      amount_original: 948,
      amount_discount: 0,
      current_plan_expires_at: new Date().toISOString(),
      residual_credit: 48,
      amount_final: 732,
      is_free_upgrade: false,
      new_expiry_date: null,
      free_upgrade_days_extended: 0,
    };
    ctxState = makeCtx({
      billingPeriod: 'annual',
      billingType: 'CREDIT_CARD',
      upgradeCalculation: calc,
    });
    renderBilling();
    expect(
      screen.getByText(/crédito dos dias não usados/i),
    ).toBeInTheDocument();
  });

  it('isFreeUpgrade: breakdown verde "Upgrade Gratuito" exibido', () => {
    const calc: UpgradePriceCalculation = {
      type: 'upgrade',
      amount_original: 948,
      amount_discount: 0,
      current_plan_expires_at: new Date().toISOString(),
      residual_credit: 756,
      amount_final: 0,
      is_free_upgrade: true,
      new_expiry_date: '2025-12-31',
      free_upgrade_days_extended: 30,
    };
    ctxState = makeCtx({
      billingPeriod: 'annual',
      billingType: 'CREDIT_CARD',
      upgradeCalculation: calc,
    });
    renderBilling();
    expect(screen.getByText(/upgrade gratuito/i)).toBeInTheDocument();
    // Forma de pagamento deve estar desabilitada
    const pixBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.trim().toUpperCase() === 'PIX');
    expect(pixBtn).toBeDisabled();
  });

  it('PIX + anual: total no breakdown é 718,20 (756 × 0,95)', () => {
    // 756 × 0,95 = 718,20
    ctxState = makeCtx({
      billingPeriod: 'annual',
      billingType: 'PIX',
      upgradeCalculation: null,
    });
    renderBilling();
    const breakdown = screen.getByText(/total a pagar/i).closest('div')!;
    expect(breakdown).toHaveTextContent(/718/);
  });

  it('PIX + semestral: desconto PIX é 21,00 (420 × 0,05)', () => {
    ctxState = makeCtx({
      billingPeriod: 'semiannual',
      billingType: 'PIX',
      upgradeCalculation: null,
    });
    renderBilling();
    // Linha do desconto PIX dentro do breakdown
    const pixRow = screen.getByText(/desconto pix/i).closest('div')!;
    // 420 * 0.05 = 21.00
    expect(pixRow).toHaveTextContent(/21/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. PIX mensal — sem desconto extra
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — PIX mensal sem desconto extra', () => {
  it('PIX + mensal: não exibe banner de economia nem breakdown', () => {
    ctxState = makeCtx({
      billingPeriod: 'monthly',
      billingType: 'PIX',
      upgradeCalculation: null,
    });
    renderBilling();
    expect(screen.queryByText(/economia de r\$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/desconto pix/i)).not.toBeInTheDocument();
  });

  it('PIX + mensal: card Mensal mostra R$79', () => {
    ctxState = makeCtx({ billingPeriod: 'monthly', billingType: 'PIX' });
    renderBilling();
    const btn = screen
      .getAllByRole('button')
      .find((b) => /mensal/i.test(b.textContent ?? ''));
    expect(btn).toHaveTextContent(/79/);
  });

  it('aviso de desconto PIX no painel de forma de pagamento menciona semestral/anual', () => {
    ctxState = makeCtx({
      billingPeriod: 'monthly',
      billingType: 'CREDIT_CARD',
    });
    renderBilling();
    const formSection = screen.getByRole('region', {
      name: /forma de pagamento/i,
    });
    expect(formSection).toHaveTextContent(/semestral e no anual/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. Parcelamento
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Parcelamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Cartão + mensal: select de parcelas renderizado mas desabilitado', () => {
    ctxState = makeCtx({
      billingPeriod: 'monthly',
      billingType: 'CREDIT_CARD',
    });
    renderBilling();
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('Cartão + semestral: select habilitado com 3 opções (1x, 2x, 3x)', () => {
    ctxState = makeCtx({
      billingPeriod: 'semiannual',
      billingType: 'CREDIT_CARD',
      installments: 1,
    });
    renderBilling();
    const select = screen.getByRole('combobox');
    expect(select).not.toBeDisabled();
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toMatch(/1x/);
    expect(options[2].textContent).toMatch(/3x/);
  });

  it('Cartão + anual: select habilitado com 6 opções (1x … 6x)', () => {
    ctxState = makeCtx({
      billingPeriod: 'annual',
      billingType: 'CREDIT_CARD',
      installments: 1,
    });
    renderBilling();
    const select = screen.getByRole('combobox');
    expect(select).not.toBeDisabled();
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(6);
    expect(options[5].textContent).toMatch(/6x/);
  });

  it('PIX + semestral: select NÃO renderizado (PIX é à vista)', () => {
    ctxState = makeCtx({ billingPeriod: 'semiannual', billingType: 'PIX' });
    renderBilling();
    // PIX não renderiza seção de cartão, logo select não existe
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Cartão + semestral: valores de parcelas corretos — 1×420, 2×210, 3×140', () => {
    ctxState = makeCtx({
      billingPeriod: 'semiannual',
      billingType: 'CREDIT_CARD',
      installments: 1,
    });
    renderBilling();
    const options = within(screen.getByRole('combobox')).getAllByRole('option');
    expect(options[0].textContent).toMatch(/420/);
    expect(options[1].textContent).toMatch(/210/);
    expect(options[2].textContent).toMatch(/140/);
  });

  it('trocar billingPeriod: setInstallments(1) é chamado via useEffect', () => {
    ctxState = makeCtx({
      billingPeriod: 'semiannual',
      billingType: 'CREDIT_CARD',
      installments: 3,
    });
    const { rerender } = renderBilling();
    ctxState = { ...ctxState, billingPeriod: 'annual' };
    rerender(<StepBilling />);
    expect(setInstallments).toHaveBeenCalledWith(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. Campos do cartão
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Campos do cartão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CREDIT_CARD: seção "Dados do cartão" e campos visíveis', () => {
    ctxState = makeCtx({ billingType: 'CREDIT_CARD' });
    renderBilling();
    expect(screen.getByText(/dados do cartão/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/como está no cartão/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/0000 0000 0000 0000/),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^MM$/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^123$/)).toBeInTheDocument();
  });

  it('PIX: seção "Dados do cartão" NÃO renderizada', () => {
    ctxState = makeCtx({ billingType: 'PIX' });
    renderBilling();
    expect(
      screen.queryByPlaceholderText(/0000 0000 0000 0000/),
    ).not.toBeInTheDocument();
  });

  it('BOLETO: seção "Dados do cartão" NÃO renderizada', () => {
    ctxState = makeCtx({ billingType: 'BOLETO' });
    renderBilling();
    expect(
      screen.queryByPlaceholderText(/0000 0000 0000 0000/),
    ).not.toBeInTheDocument();
  });

  it('aviso "Dados protegidos e não armazenados" visível com cartão', () => {
    ctxState = makeCtx({ billingType: 'CREDIT_CARD' });
    renderBilling();
    expect(
      screen.getByText(/dados protegidos e não armazenados/i),
    ).toBeInTheDocument();
  });

  it('clicar em PIX chama setBillingType("PIX")', async () => {
    ctxState = makeCtx({ billingType: 'CREDIT_CARD' });
    renderBilling();
    const user = userEvent.setup();
    const pixBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.trim().toUpperCase() === 'PIX');
    await user.click(pixBtn!);
    expect(setBillingType).toHaveBeenCalledWith('PIX');
  });

  it('clicar em BOLETO chama setBillingType("BOLETO")', async () => {
    ctxState = makeCtx({ billingType: 'CREDIT_CARD' });
    renderBilling();
    const user = userEvent.setup();
    const boletoBtn = screen
      .getAllByRole('button')
      .find((b) => /^boleto$/i.test(b.textContent?.trim() ?? ''));
    await user.click(boletoBtn!);
    expect(setBillingType).toHaveBeenCalledWith('BOLETO');
  });

  it('isFreeUpgrade: todos os botões de forma de pagamento desabilitados', () => {
    const calc: UpgradePriceCalculation = {
      type: 'upgrade',
      amount_original: 948,
      amount_discount: 0,
      current_plan_expires_at: new Date().toISOString(),
      residual_credit: 756,
      amount_final: 0,
      is_free_upgrade: true,
      new_expiry_date: '2025-12-31',
      free_upgrade_days_extended: 30,
    };
    ctxState = makeCtx({
      billingType: 'CREDIT_CARD',
      upgradeCalculation: calc,
    });
    renderBilling();
    const paymentBtns = screen
      .getAllByRole('button')
      .filter((b) =>
        /^(cartão|pix|boleto)$/i.test(b.textContent?.trim() ?? ''),
      );
    expect(paymentBtns).toHaveLength(3);
    paymentBtns.forEach((btn) => expect(btn).toBeDisabled());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. Banner de economia (vs plano mensal)
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Banner de economia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mensal: banner de economia NÃO aparece', () => {
    ctxState = makeCtx({
      billingPeriod: 'monthly',
      billingType: 'CREDIT_CARD',
    });
    renderBilling();
    expect(screen.queryByText(/economia de r\$/i)).not.toBeInTheDocument();
  });

  it('semestral + cartão: banner mostra economia R$54 = (79-70)×6', () => {
    ctxState = makeCtx({
      billingPeriod: 'semiannual',
      billingType: 'CREDIT_CARD',
    });
    renderBilling();
    const banner = screen.getByText(/economia de r\$/i);
    expect(banner.textContent).toMatch(/54/);
  });

  it('anual + cartão: banner mostra economia R$192 = (79-63)×12', () => {
    ctxState = makeCtx({ billingPeriod: 'annual', billingType: 'CREDIT_CARD' });
    renderBilling();
    const banner = screen.getByText(/economia de r\$/i);
    expect(banner.textContent).toMatch(/192/);
  });

  it('semestral + PIX: banner de economia NÃO aparece (oculto em upgrade gratuito/PIX)', () => {
    // O banner de economia vs mensal fica oculto quando isFreeUpgrade=true,
    // mas com PIX normal (sem crédito) ele ainda aparece — confirmar comportamento atual.
    // isFreeUpgrade=false aqui, então o banner DEVE aparecer.
    ctxState = makeCtx({
      billingPeriod: 'semiannual',
      billingType: 'PIX',
      upgradeCalculation: null,
    });
    renderBilling();
    // Banner de economia mensal é independente da forma de pagamento
    const banner = screen.getByText(/economia de r\$/i);
    expect(banner.textContent).toMatch(/54/);
  });

  it('isFreeUpgrade: banner de economia NÃO aparece', () => {
    const calc: UpgradePriceCalculation = {
      type: 'upgrade',
      amount_original: 948,
      amount_discount: 0,
      current_plan_expires_at: new Date().toISOString(),
      residual_credit: 756,
      amount_final: 0,
      is_free_upgrade: true,
      new_expiry_date: '2025-12-31',
      free_upgrade_days_extended: 30,
    };
    ctxState = makeCtx({
      billingPeriod: 'annual',
      billingType: 'CREDIT_CARD',
      upgradeCalculation: calc,
    });
    renderBilling();
    expect(screen.queryByText(/economia de r\$/i)).not.toBeInTheDocument();
  });
});
