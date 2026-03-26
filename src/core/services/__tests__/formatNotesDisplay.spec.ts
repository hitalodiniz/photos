/**
 * Testes de formatNotesDisplay (espelha AssinaturaContent) com notas JSON v1.
 */

import { CANCEL_REASONS as REASONS_ARRAY } from '@/app/(dashboard)/dashboard/assinatura/CancelSubscriptionModal';
import { billingNotesDisplayText } from '@/core/services/asaas/utils/billing-notes-doc';
import { describe, it, expect } from 'vitest';

const CANCEL_REASONS = REASONS_ARRAY.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

function v1(log: string[]) {
  return JSON.stringify({ v: 1, log });
}

/** Cópia da lógica em AssinaturaContent.tsx */
function formatNotesDisplay(notes: string | null | undefined): string {
  const text = billingNotesDisplayText(notes);
  if (!text.trim()) return '';

  const lowerNotes = text.toLowerCase();

  const posReactivation = Math.max(
    text.lastIndexOf('[Reactivation'),
    text.lastIndexOf('Assinatura reativada'),
  );
  const posCancelSolicitado = text.lastIndexOf('Cancelamento solicitado');
  if (posCancelSolicitado > posReactivation) {
    const tail = text.slice(posCancelSolicitado);
    const refundTail = tail.match(/Estorno:\s*SIM\s*\(([^)]+)\)/i)?.[1];
    if (refundTail) {
      return `Cancelamento com estorno (${refundTail})`;
    }
    if (/Estorno:\s*SIM/i.test(tail)) {
      return 'Cancelamento com estorno';
    }
    if (/Estorno:\s*NÃO/i.test(tail) || /Estorno:\s*NAO/i.test(tail)) {
      return 'Cancelamento sem estorno';
    }
    return 'Cancelamento solicitado';
  }
  if (posReactivation >= 0) {
    return 'Assinatura reativada';
  }

  const refundWithAmount = text.match(/Estorno:\s*SIM\s*\(([^)]+)\)/i)?.[1];
  if (refundWithAmount) {
    return `Cancelamento com estorno (${refundWithAmount})`;
  }
  if (/Estorno:\s*SIM/i.test(text)) {
    return 'Cancelamento com estorno';
  }
  if (/Estorno:\s*NÃO/i.test(text) || /Estorno:\s*NAO/i.test(text)) {
    return 'Cancelamento sem estorno';
  }

  const autoCancelNoPaymentMatch = text.match(
    /Cancelamento automático por falta de pagamento no prazo\s*\(([^)]+)\)/i,
  );
  if (autoCancelNoPaymentMatch?.[1]) {
    return `Cancelamento automático por falta de pagamento (${autoCancelNoPaymentMatch[1]})`;
  }
  if (/Cancelamento automático por falta de pagamento no prazo/i.test(text)) {
    return 'Cancelamento automático por falta de pagamento';
  }

  if (
    lowerNotes.includes('renovação mensal') ||
    lowerNotes.includes('renovação automática')
  ) {
    return 'Renovação Mensal';
  }
  if (lowerNotes.includes('aproveitamento de crédito')) {
    return 'Upgrade com crédito aproveitado';
  }
  if (lowerNotes.includes('upgrade gratuito')) {
    return 'Upgrade gratuito';
  }

  const paymentLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('[PaymentMethodChange '));

  if (paymentLines.length) {
    const lastLine = paymentLines[paymentLines.length - 1];
    const match = lastLine.match(/\] (.*)/);
    if (match?.[1]) {
      return `Forma de pagamento alterada de ${match[1]
        .replace('->', 'para')
        .replace(/_/g, ' ')
        .toLowerCase()}`;
    }
    return '';
  }

  if (text.includes('Cancelamento solicitado')) return 'Cancelamento solicitado';

  return '';
}

describe('formatNotesDisplay — vazio / inválido', () => {
  it('null → ""', () => expect(formatNotesDisplay(null)).toBe(''));
  it('undefined → ""', () => expect(formatNotesDisplay(undefined)).toBe(''));
  it('string vazia → ""', () => expect(formatNotesDisplay('')).toBe(''));
  it('JSON que não é v1 → ""', () =>
    expect(formatNotesDisplay('{"type":"cancellation"}')).toBe(''));
});

describe('formatNotesDisplay — resumo a partir do log v1', () => {
  it('texto simples sem padrão → ""', () => {
    expect(formatNotesDisplay(v1(['Apenas um registro genérico']))).toBe('');
  });

  it('upgrade gratuito no log', () => {
    expect(
      formatNotesDisplay(
        v1(['Upgrade gratuito (Crédito): Plano PLUS. Saldo residual R$ 10']),
      ),
    ).toBe('Upgrade gratuito');
  });

  it('aproveitamento de crédito no log', () => {
    expect(
      formatNotesDisplay(v1(['Aproveitamento de crédito pro-rata: R$ 12,50'])),
    ).toBe('Upgrade com crédito aproveitado');
  });

  it('cancelamento solicitado', () => {
    expect(
      formatNotesDisplay(
        v1(['Cancelamento solicitado. Acesso até 2026-04-01T00:00:00.000Z.']),
      ),
    ).toBe('Cancelamento solicitado');
  });

  it('reativação após cancelamento sem estorno: linha [Reactivation] prevalece', () => {
    expect(
      formatNotesDisplay(
        v1([
          'Cancelamento solicitado em 2026-03-01. Acesso até 2026-03-31. Estorno: NÃO.',
          '[Reactivation 25/03/2026, 22:20:23] Assinatura reativada em 25/03/2026, 22:20:23.',
        ]),
      ),
    ).toBe('Assinatura reativada');
  });

  it('novo cancelamento após reativação: último Cancelamento solicitado prevalece', () => {
    expect(
      formatNotesDisplay(
        v1([
          'Cancelamento solicitado em 2026-03-01T12:00:00.000Z. Acesso até 2026-05-12T00:00:00.000Z. Estorno: NÃO.',
          '[Reactivation 25/03/2026, 22:20:23] Assinatura reativada em 25/03/2026, 22:20:23.',
          'Cancelamento solicitado em 2026-03-25T22:30:00.000Z. Acesso até 2026-05-12T00:00:00.000Z. Estorno: NÃO. | Motivo: not_using',
        ]),
      ),
    ).toBe('Cancelamento sem estorno');
  });

  it('estorno com valor', () => {
    expect(
      formatNotesDisplay(
        v1(['Cancelamento. Estorno: SIM (R$ 79,00 aplicado no cartão).']),
      ),
    ).toBe('Cancelamento com estorno (R$ 79,00 aplicado no cartão)');
  });

  it('PaymentMethodChange — última linha', () => {
    const line =
      '[PaymentMethodChange 2026-01-01T12:00:00Z] PIX -> BOLETO';
    expect(formatNotesDisplay(v1([line]))).toMatch(/forma de pagamento/i);
  });
});

describe('formatNotesDisplay — JSON que não é BillingNotesDocV1', () => {
  it('objeto arbitrário (ex. type=cancellation) → resumo vazio', () => {
    const notes = JSON.stringify({
      type: 'cancellation',
      reason: 'too_expensive',
      comment: 'Caro demais',
    });
    expect(formatNotesDisplay(notes)).toBe('');
  });
});

describe('CANCEL_REASONS — export', () => {
  const EXPECTED_KEYS = [
    'too_expensive',
    'not_using',
    'missing_features',
    'switching_competitor',
    'temporary_pause',
    'technical_issues',
    'other',
  ];

  it('exporta exatamente as 7 chaves esperadas', () => {
    const exportedKeys = REASONS_ARRAY.map((r) => r.value);
    expect(exportedKeys.sort()).toEqual(EXPECTED_KEYS.sort());
  });

  it('todas as chaves têm label em português', () => {
    EXPECTED_KEYS.forEach((key) => {
      expect(CANCEL_REASONS[key]).toBeTruthy();
      expect(CANCEL_REASONS[key]).not.toBe(key);
    });
  });
});
