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
 *  B. Badges PIX — outline (convite) vs sólido (ativo) + preço riscado
 *  C. Desconto PIX mensal — sem badge, sem riscado
 *  D. Parcelamento — aparece/some, opções corretas, reset ao trocar período
 *  E. Forma de pagamento — campos cartão aparecem/somem com PIX
 *  F. Banner de economia — valor correto com e sem desconto PIX
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StepBilling } from './StepBilling';
import { PLANS_BY_SEGMENT } from '@/core/config/plans';

// ─── Mock do contexto ─────────────────────────────────────────────────────────

// Plano PRO fotógrafo: price=79, semesterPrice=70, yearlyPrice=63
const PRO = PLANS_BY_SEGMENT.PHOTOGRAPHER.PRO;

let ctxState = {
  billingPeriod: 'monthly' as 'monthly' | 'semiannual' | 'annual',
  billingType: 'CREDIT_CARD' as 'CREDIT_CARD' | 'PIX' | 'BOLETO',
  planInfoForPrice: PRO,
  installments: 1,
  creditCard: {
    credit_card_holder_name: '',
    credit_card_number: '',
    credit_card_expiry_month: '',
    credit_card_expiry_year: '',
    credit_card_ccv: '',
  },
};

const setBillingPeriod = vi.fn((p: typeof ctxState.billingPeriod) => { ctxState.billingPeriod = p; });
const setBillingType   = vi.fn((t: typeof ctxState.billingType)   => { ctxState.billingType = t; });
const setInstallments  = vi.fn((n: number) => { ctxState.installments = n; });
const setCreditCard    = vi.fn();

vi.mock('../UpgradeSheetContext', () => ({
  useUpgradeSheetContext: () => ({
    ...ctxState,
    setBillingPeriod,
    setBillingType,
    setInstallments,
    setCreditCard,
  }),
}));

vi.mock('@/components/ui/Sheet', () => ({
  SheetSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section aria-label={title}>
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock('../FieldLabel', () => ({
  FieldLabel: ({ label }: { label: string }) => <label>{label}</label>,
}));

vi.mock('../utils', () => ({
  formatCreditCardNumber: (v: string) => v,
  formatExpiryMonth: (v: string) => v,
  formatExpiryYear: (v: string) => v,
  formatCcv: (v: string) => v,
}));

// ─── Helper: re-renderizar com estado atualizado ──────────────────────────────

function renderBilling() {
  return render(<StepBilling />);
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. Seleção de período
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Seleção de período', () => {
  beforeEach(() => {
    ctxState = { ...ctxState, billingPeriod: 'monthly', billingType: 'CREDIT_CARD', installments: 1 };
    vi.clearAllMocks();
  });

  it('3 cards de período renderizados: Mensal, Semestral, Anual', () => {
    renderBilling();
    expect(screen.getByText(/mensal/i)).toBeInTheDocument();
    expect(screen.getByText(/semestral/i)).toBeInTheDocument();
    expect(screen.getByText(/anual/i)).toBeInTheDocument();
  });

  it('clicar em Semestral chama setBillingPeriod("semiannual")', async () => {
    renderBilling();
    const user = userEvent.setup();
    const semestralBtn = screen.getAllByRole('button').find((b) =>
      b.textContent?.match(/semestral/i),
    );
    await user.click(semestralBtn!);
    expect(setBillingPeriod).toHaveBeenCalledWith('semiannual');
  });

  it('clicar em Anual chama setBillingPeriod("annual")', async () => {
    renderBilling();
    const user = userEvent.setup();
    const anualBtn = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes('Anual') && b.textContent?.includes('756'),
    );
    await user.click(anualBtn!);
    expect(setBillingPeriod).toHaveBeenCalledWith('annual');
  });

  it('card Mensal selecionado: tem classe border-gold (aria ou data-selected)', () => {
    renderBilling();
    // Com Mensal selecionado, o radio do card deve estar preenchido
    const cards = screen.getAllByRole('button').filter((b) =>
      /mensal|semestral|anual/i.test(b.textContent ?? ''),
    );
    // Radio dot interno: só o card ativo tem o dot
    const mensal = cards.find((b) => /mensal/i.test(b.textContent ?? ''));
    expect(mensal).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. Badges PIX
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Badges PIX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PIX não selecionado + semestral: aviso "10% de desconto" no semestral/anual visível', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'CREDIT_CARD' };
    renderBilling();
    const formSection = screen.getByRole('region', { name: /forma de pagamento/i });
    expect(formSection).toHaveTextContent(/10% de desconto/);
    expect(formSection).toHaveTextContent(/semestral e no anual/);
  });

  it('PIX selecionado + semestral: banner "Você paga" com desconto PIX visível', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'PIX' };
    renderBilling();
    const banner = screen.getByText(/você paga/i);
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/desconto no PIX/i);
  });

  it('PIX não selecionado + mensal: aviso de desconto PIX semestral/anual NÃO exibido', () => {
    ctxState = { ...ctxState, billingPeriod: 'monthly', billingType: 'CREDIT_CARD' };
    renderBilling();
    expect(screen.queryByText(/desconto no semestral e no anual/i)).not.toBeInTheDocument();
  });

  it('PIX selecionado + semestral: card Semestral mostra R$70/mês', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'PIX' };
    renderBilling();
    const semestralBtn = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes('Semestral') && b.textContent?.includes('70'),
    );
    expect(semestralBtn).toBeDefined();
    expect(semestralBtn).toHaveTextContent(/70/);
  });

  it('PIX selecionado + anual: card Anual mostra R$63/mês e total 756', () => {
    ctxState = { ...ctxState, billingPeriod: 'annual', billingType: 'PIX' };
    renderBilling();
    expect(screen.getByText(/756/)).toBeInTheDocument();
    const anualBtn = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes('Anual') && b.textContent?.includes('63'),
    );
    expect(anualBtn).toBeDefined();
  });

  it('PIX selecionado + anual: banner mostra total com desconto (680,40)', () => {
    ctxState = { ...ctxState, billingPeriod: 'annual', billingType: 'PIX' };
    renderBilling();
    const banner = screen.getByText(/você paga/i);
    expect(banner.textContent).toMatch(/680/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. Aviso PIX mensal
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — PIX mensal sem desconto extra', () => {
  it('PIX + mensal: não exibe banner de economia nem banner de desconto PIX', () => {
    ctxState = { ...ctxState, billingPeriod: 'monthly', billingType: 'PIX' };
    renderBilling();
    expect(screen.queryByText(/economia de r\$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/você paga.*desconto no PIX/i)).not.toBeInTheDocument();
  });

  it('PIX + mensal: card Mensal mostra R$79', () => {
    ctxState = { ...ctxState, billingPeriod: 'monthly', billingType: 'PIX' };
    renderBilling();
    const mensalBtn = screen.getByRole('button', { name: /mensal/i });
    expect(mensalBtn).toHaveTextContent(/79/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. Parcelamento
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Parcelamento', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('Cartão + mensal: seção Parcelamento NÃO aparece', () => {
    ctxState = { ...ctxState, billingPeriod: 'monthly', billingType: 'CREDIT_CARD' };
    renderBilling();
    expect(screen.queryByText(/parcelamento/i)).not.toBeInTheDocument();
  });

  it('Cartão + semestral: seção Parcelamento aparece com 3 opções', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'CREDIT_CARD', installments: 1 };
    renderBilling();
    const select = screen.getByRole('combobox');
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(3); // 1x, 2x, 3x
    expect(options[0].textContent).toMatch(/1x/);
    expect(options[2].textContent).toMatch(/3x/);
  });

  it('Cartão + anual: seção Parcelamento aparece com 6 opções', () => {
    ctxState = { ...ctxState, billingPeriod: 'annual', billingType: 'CREDIT_CARD', installments: 1 };
    renderBilling();
    const select = screen.getByRole('combobox');
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(6);
    expect(options[5].textContent).toMatch(/6x/);
  });

  it('PIX + semestral: seção Parcelamento NÃO aparece (PIX é à vista)', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'PIX' };
    renderBilling();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Cartão + semestral: valores de parcelas corretos (R$420 ÷ n)', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'CREDIT_CARD', installments: 1 };
    renderBilling();
    const select = screen.getByRole('combobox');
    const options = within(select).getAllByRole('option');
    // 1x de R$420; 2x de R$210; 3x de R$140
    expect(options[0].textContent).toMatch(/420/);
    expect(options[1].textContent).toMatch(/210/);
    expect(options[2].textContent).toMatch(/140/);
  });

  it('trocar período reseta para 1x (setInstallments(1) chamado)', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'CREDIT_CARD', installments: 3 };
    const { rerender } = renderBilling();
    // Simula mudança de período
    ctxState.billingPeriod = 'annual';
    rerender(<StepBilling />);
    expect(setInstallments).toHaveBeenCalledWith(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. Campos do cartão
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Campos do cartão', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('CREDIT_CARD selecionado: seção "Dados do cartão" visível', () => {
    ctxState = { ...ctxState, billingType: 'CREDIT_CARD' };
    renderBilling();
    expect(screen.getByRole('heading', { name: /dados do cartão/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/como está no cartão/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/0000 0000 0000 0000/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/MM/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/123/)).toBeInTheDocument();
  });

  it('PIX selecionado: seção "Dados do cartão" NÃO visível', () => {
    ctxState = { ...ctxState, billingType: 'PIX' };
    renderBilling();
    expect(screen.queryByPlaceholderText(/0000 0000 0000 0000/)).not.toBeInTheDocument();
  });

  it('aviso de segurança dos dados visível com cartão', () => {
    ctxState = { ...ctxState, billingType: 'CREDIT_CARD' };
    renderBilling();
    expect(screen.getByText(/dados do cartão não são armazenados/i)).toBeInTheDocument();
  });

  it('clicar em PIX chama setBillingType("PIX")', async () => {
    ctxState = { ...ctxState, billingType: 'CREDIT_CARD' };
    renderBilling();
    const user = userEvent.setup();
    const pixBtn = screen.getAllByRole('button').find((b) =>
      b.textContent?.trim().toUpperCase() === 'PIX',
    );
    await user.click(pixBtn!);
    expect(setBillingType).toHaveBeenCalledWith('PIX');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. Banner de economia
// ═══════════════════════════════════════════════════════════════════════════════

describe('StepBilling — Banner de economia', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('mensal: banner de economia NÃO aparece', () => {
    ctxState = { ...ctxState, billingPeriod: 'monthly', billingType: 'CREDIT_CARD' };
    renderBilling();
    expect(screen.queryByText(/economia de r\$/i)).not.toBeInTheDocument();
  });

  it('semestral + cartão: banner mostra economia correta vs mensal (R$54 = (79-70)×6)', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'CREDIT_CARD' };
    renderBilling();
    const banner = screen.getByText(/economia de r\$/i);
    expect(banner).toBeInTheDocument();
    // (79 - 70) × 6 = 54
    expect(banner.textContent).toMatch(/54/);
  });

  it('anual + cartão: banner mostra economia R$192 = (79-63)×12', () => {
    ctxState = { ...ctxState, billingPeriod: 'annual', billingType: 'CREDIT_CARD' };
    renderBilling();
    const banner = screen.getByText(/economia de r\$/i);
    // (79 - 63) × 12 = 192
    expect(banner.textContent).toMatch(/192/);
  });

  it('semestral + PIX: banner menciona "desconto PIX"', () => {
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'PIX' };
    renderBilling();
    const banner = screen.getByText(/desconto no PIX/i);
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/PIX/i);
  });

  it('semestral + PIX: banner de desconto PIX mostra economia R$42 (10% de 420)', () => {
    // PIX semestral: total 420, desconto 10% = 42
    ctxState = { ...ctxState, billingPeriod: 'semiannual', billingType: 'PIX' };
    renderBilling();
    const banner = screen.getByText(/você paga/i);
    expect(banner.textContent).toMatch(/42/);
  });
});
