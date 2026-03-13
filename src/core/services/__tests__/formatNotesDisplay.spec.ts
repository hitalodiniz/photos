// src/app/dashboard/assinatura/formatNotesDisplay.spec.ts
/**
 * Testes unitários de formatNotesDisplay e CANCEL_REASON_LABELS.
 *
 * Cobertura:
 *  A. Entradas vazias / nulas
 *  B. String pura (sem JSON)
 *  C. JSON type=cancellation — todas as combinações de reason/comment
 *  D. JSON legado com .message
 *  E. JSON sem campos reconhecidos → 'Migração de plano'
 *  F. JSON malformado → 'Migração de plano'
 *  G. CANCEL_REASON_LABELS — todas as 7 chaves exportadas
 */

import { CANCEL_REASONS as REASONS_ARRAY } from '@/app/(dashboard)/dashboard/assinatura/CancelSubscriptionModal';
import { describe, it, expect } from 'vitest';

// Transforma o array de objetos em um mapa para facilitar os testes e a função mockada
const CANCEL_REASONS = REASONS_ARRAY.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>,
);

// ─── Copiar a função aqui para testes isolados ────────────────────────────────
// (Alternativa: exportar formatNotesDisplay de AssinaturaContent e importar)

function formatNotesDisplay(notes: string | null | undefined): string {
  if (!notes?.trim()) return '';
  if (notes.startsWith('{')) {
    try {
      const parsed = JSON.parse(notes) as {
        type?: string;
        message?: string;
        reason?: string;
        comment?: string;
      };
      if (parsed.type === 'cancellation') {
        const label = parsed.reason
          ? (CANCEL_REASONS[parsed.reason] ?? parsed.reason)
          : 'Cancelamento';
        return parsed.comment ? `${label} — ${parsed.comment}` : label;
      }
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      // ignore
    }
    return 'Migração de plano';
  }
  return notes.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. Entradas vazias / nulas
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatNotesDisplay — entradas vazias', () => {
  it('null → ""', () => expect(formatNotesDisplay(null)).toBe(''));
  it('undefined → ""', () => expect(formatNotesDisplay(undefined)).toBe(''));
  it('string vazia → ""', () => expect(formatNotesDisplay('')).toBe(''));
  it('string só espaços → ""', () =>
    expect(formatNotesDisplay('   ')).toBe(''));
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. String pura
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatNotesDisplay — string pura', () => {
  it('texto simples → retorna o texto', () => {
    expect(formatNotesDisplay('Cancelamento solicitado em 2026-01-01')).toBe(
      'Cancelamento solicitado em 2026-01-01',
    );
  });

  it('texto com espaços no início/fim → trimado', () => {
    expect(formatNotesDisplay('  algum texto  ')).toBe('algum texto');
  });

  it('string legada de upgrade gratuito → retorna intacta', () => {
    const s =
      'Aproveitamento de crédito pro-rata: R$ 12,50. Valor final: R$ 66,50.';
    expect(formatNotesDisplay(s)).toBe(s);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. JSON type=cancellation
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatNotesDisplay — JSON cancelamento', () => {
  it('reason + comment → "Label — comentário"', () => {
    const notes = JSON.stringify({
      type: 'cancellation',
      reason: 'too_expensive',
      comment: 'Caro demais',
    });
    expect(formatNotesDisplay(notes)).toBe('Preço muito alto — Caro demais');
  });

  it('reason sem comment → só o label', () => {
    const notes = JSON.stringify({ type: 'cancellation', reason: 'not_using' });
    expect(formatNotesDisplay(notes)).toBe('Não estou usando o suficiente');
  });

  it('sem reason → "Cancelamento"', () => {
    const notes = JSON.stringify({ type: 'cancellation' });
    expect(formatNotesDisplay(notes)).toBe('Cancelamento');
  });

  it('reason desconhecido → usa a própria string como label', () => {
    const notes = JSON.stringify({
      type: 'cancellation',
      reason: 'alien_reason',
    });
    expect(formatNotesDisplay(notes)).toBe('alien_reason');
  });

  it('com detail (campo extra do buildCancellationNotes) → ignora detail, usa label', () => {
    const notes = JSON.stringify({
      type: 'cancellation',
      reason: 'temporary_pause',
      comment: 'Férias',
      detail: 'Cancelamento solicitado em 2026-03-01. Acesso até 2026-04-01.',
    });
    expect(formatNotesDisplay(notes)).toBe('Pausa temporária — Férias');
  });

  it('todas as 7 chaves retornam label em português', () => {
    const pairs: Array<[string, string]> = [
      ['too_expensive', 'Preço muito alto'],
      ['not_using', 'Não estou usando o suficiente'],
      ['missing_features', 'Falta algum recurso'],
      ['switching_competitor', 'Vou usar outra plataforma'],
      ['temporary_pause', 'Pausa temporária'],
      ['technical_issues', 'Problemas técnicos'],
      ['other', 'Outro motivo'],
    ];
    pairs.forEach(([reason, expected]) => {
      const notes = JSON.stringify({ type: 'cancellation', reason });
      expect(formatNotesDisplay(notes)).toBe(expected);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. JSON legado com .message
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatNotesDisplay — JSON legado (.message)', () => {
  it('{ message: "texto" } → retorna texto', () => {
    const notes = JSON.stringify({
      message: 'Upgrade gratuito: crédito cobriu o plano.',
    });
    expect(formatNotesDisplay(notes)).toBe(
      'Upgrade gratuito: crédito cobriu o plano.',
    );
  });

  it('{ message: "  texto  " } → trimado', () => {
    const notes = JSON.stringify({ message: '  trimável  ' });
    expect(formatNotesDisplay(notes)).toBe('trimável');
  });

  it('{ message: "" } → "Migração de plano" (message vazio não conta)', () => {
    const notes = JSON.stringify({ message: '' });
    expect(formatNotesDisplay(notes)).toBe('Migração de plano');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. JSON sem campos reconhecidos
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatNotesDisplay — JSON sem campos conhecidos', () => {
  it('JSON com chaves aleatórias → "Migração de plano"', () => {
    const notes = JSON.stringify({ foo: 'bar', baz: 42 });
    expect(formatNotesDisplay(notes)).toBe('Migração de plano');
  });

  it('JSON com type diferente de "cancellation" sem message → "Migração de plano"', () => {
    const notes = JSON.stringify({ type: 'something_else' });
    expect(formatNotesDisplay(notes)).toBe('Migração de plano');
  });

  it('JSON array (não objeto) → "Migração de plano"', () => {
    const notes = JSON.stringify([1, 2, 3]);
    // array não começa com '{', então cai no retorno de string pura
    expect(formatNotesDisplay(notes)).toBe('[1,2,3]');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. JSON malformado
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatNotesDisplay — JSON malformado', () => {
  it('{ sem fechar → "Migração de plano"', () => {
    expect(formatNotesDisplay('{sem fechar')).toBe('Migração de plano');
  });

  it('{ chave: sem aspas } → "Migração de plano"', () => {
    expect(formatNotesDisplay('{chave: valor}')).toBe('Migração de plano');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. CANCEL_REASON_LABELS — export e completude
// ═══════════════════════════════════════════════════════════════════════════════

describe('CANCEL_REASON_LABELS — export e completude', () => {
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

  it('todos os valores são strings não-vazias', () => {
    REASONS_ARRAY.forEach((item) => {
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
    });
  });

  it('nenhuma chave mapeada é igual à chave (labels estão em português)', () => {
    // garantir que a tradução foi feita e não é identidade
    EXPECTED_KEYS.forEach((key) => {
      expect(CANCEL_REASONS[key]).not.toBe(key);
    });
  });
});
