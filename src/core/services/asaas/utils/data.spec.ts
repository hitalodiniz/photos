// __tests__/utils/dates.test.ts
import { describe, it, expect } from 'vitest';
import {
  addMonths,
  addDays,
  billingPeriodToMonths,
  parseExpiryFromNotes,
  periodOrder,
} from '@/core/services/asaas/utils/dates';

describe('dates utils', () => {
  describe('addMonths', () => {
    it('deve adicionar 12 meses corretamente (caso do bug reportado)', () => {
      const date = new Date('2026-03-17');
      const result = addMonths(date, 12);
      expect(result.toISOString().split('T')[0]).toBe('2027-03-17');
    });

    it('deve adicionar 6 meses corretamente (plano semestral)', () => {
      const date = new Date('2026-03-17');
      const result = addMonths(date, 6);
      expect(result.toISOString().split('T')[0]).toBe('2026-09-17');
    });

    it('deve adicionar 1 mês corretamente (plano mensal)', () => {
      const date = new Date('2026-03-17');
      const result = addMonths(date, 1);
      expect(result.toISOString().split('T')[0]).toBe('2026-04-17');
    });

    it('deve lidar com overflow de dia (31/jan + 1 mês = 28/fev)', () => {
      const date = new Date('2026-01-31');
      const result = addMonths(date, 1);
      expect(result.toISOString().split('T')[0]).toBe('2026-02-28');
    });

    it('deve lidar com overflow de dia (31/mar + 1 mês = 30/abr)', () => {
      const date = new Date('2026-03-31');
      const result = addMonths(date, 1);
      expect(result.toISOString().split('T')[0]).toBe('2026-04-30');
    });

    it('deve lidar com ano bissexto (29/fev/2024 + 12 meses = 28/fev/2025)', () => {
      const date = new Date('2024-02-29');
      const result = addMonths(date, 12);
      expect(result.toISOString().split('T')[0]).toBe('2025-02-28');
    });

    it('deve preservar ano bissexto quando aplicável (29/fev/2024 + 48 meses = 28/fev/2028)', () => {
      const date = new Date('2024-02-29');
      const result = addMonths(date, 48);
      // 2028 é bissexto, então tem dia 29
      expect(result.toISOString().split('T')[0]).toBe('2028-02-29');
    });

    it('deve lidar com meses negativos (voltar no tempo)', () => {
      const date = new Date('2026-03-17');
      const result = addMonths(date, -3);
      expect(result.toISOString().split('T')[0]).toBe('2025-12-17');
    });

    it('deve funcionar com início de ano', () => {
      const date = new Date('2026-01-01');
      const result = addMonths(date, 12);
      expect(result.toISOString().split('T')[0]).toBe('2027-01-01');
    });

    it('deve funcionar com fim de ano', () => {
      const date = new Date('2026-12-31');
      const result = addMonths(date, 1);
      expect(result.toISOString().split('T')[0]).toBe('2027-01-31');
    });

    it('deve não modificar a data original', () => {
      const original = new Date('2026-03-17');
      const originalISO = original.toISOString();
      addMonths(original, 12);
      expect(original.toISOString()).toBe(originalISO);
    });
  });

  describe('addDays', () => {
    it('deve adicionar dias inteiros corretamente', () => {
      const date = new Date('2026-03-17');
      const result = addDays(date, 30);
      expect(result.toISOString().split('T')[0]).toBe('2026-04-16');
    });

    it('deve adicionar 360 dias (ano comercial)', () => {
      const date = new Date('2026-03-17');
      const result = addDays(date, 360);
      expect(result.toISOString().split('T')[0]).toBe('2027-03-12');
    });

    it('deve adicionar 365 dias (ano real)', () => {
      const date = new Date('2026-03-17');
      const result = addDays(date, 365);
      expect(result.toISOString().split('T')[0]).toBe('2027-03-17');
    });

    it('deve arredondar dias decimais', () => {
      const date = new Date('2026-03-17');
      const result = addDays(date, 30.7);
      expect(result.toISOString().split('T')[0]).toBe('2026-04-17');
    });

    it('deve lidar com dias negativos', () => {
      const date = new Date('2026-03-17');
      const result = addDays(date, -7);
      expect(result.toISOString().split('T')[0]).toBe('2026-03-10');
    });

    it('deve não modificar a data original', () => {
      const original = new Date('2026-03-17');
      const originalISO = original.toISOString();
      addDays(original, 30);
      expect(original.toISOString()).toBe(originalISO);
    });
  });

  describe('billingPeriodToMonths', () => {
    it('deve retornar 12 para "annual"', () => {
      expect(billingPeriodToMonths('annual')).toBe(12);
    });

    it('deve retornar 6 para "semiannual"', () => {
      expect(billingPeriodToMonths('semiannual')).toBe(6);
    });

    it('deve retornar 1 para "monthly"', () => {
      expect(billingPeriodToMonths('monthly')).toBe(1);
    });

    it('deve retornar 1 para null', () => {
      expect(billingPeriodToMonths(null)).toBe(1);
    });

    it('deve retornar 1 para undefined', () => {
      expect(billingPeriodToMonths(undefined)).toBe(1);
    });

    it('deve retornar 1 para string vazia', () => {
      expect(billingPeriodToMonths('')).toBe(1);
    });

    it('deve retornar 1 para valor desconhecido', () => {
      expect(billingPeriodToMonths('quarterly')).toBe(1);
    });
  });

  describe('parseExpiryFromNotes', () => {
    const v1 = (log: string[]) => JSON.stringify({ v: 1, log });

    it('deve extrair data válida das notes', () => {
      const notes = v1([
        'Upgrade gratuito. Nova data de vencimento: 2027-03-17',
      ]);
      const result = parseExpiryFromNotes(notes);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().split('T')[0]).toBe('2027-03-17');
    });

    it('deve extrair data no meio do texto', () => {
      const notes = v1([
        'Saldo residual R$ 100.00; nova data de vencimento: 2027-03-17. Status: OK',
      ]);
      const result = parseExpiryFromNotes(notes);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().split('T')[0]).toBe('2027-03-17');
    });

    it('deve ser case-insensitive', () => {
      const notes = v1(['NOVA DATA DE VENCIMENTO: 2027-03-17']);
      const result = parseExpiryFromNotes(notes);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().split('T')[0]).toBe('2027-03-17');
    });

    it('deve retornar null para notes null', () => {
      expect(parseExpiryFromNotes(null)).toBeNull();
    });

    it('deve retornar null para notes undefined', () => {
      expect(parseExpiryFromNotes(undefined)).toBeNull();
    });

    it('deve retornar null para notes vazia', () => {
      expect(parseExpiryFromNotes('')).toBeNull();
    });

    it('deve retornar null para notes sem data', () => {
      const notes = v1(['Upgrade realizado com sucesso']);
      expect(parseExpiryFromNotes(notes)).toBeNull();
    });

    it('deve retornar null para data inválida', () => {
      const notes = v1(['Nova data de vencimento: data-invalida']);
      expect(parseExpiryFromNotes(notes)).toBeNull();
    });

    it('deve funcionar com formato ISO completo', () => {
      const notes = v1(['Nova data de vencimento: 2027-03-17T00:00:00.000Z']);
      const result = parseExpiryFromNotes(notes);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().split('T')[0]).toBe('2027-03-17');
    });
  });

  describe('periodOrder', () => {
    it('deve retornar 12 para "annual"', () => {
      expect(periodOrder('annual')).toBe(12);
    });

    it('deve retornar 6 para "semiannual"', () => {
      expect(periodOrder('semiannual')).toBe(6);
    });

    it('deve retornar 1 para "monthly"', () => {
      expect(periodOrder('monthly')).toBe(1);
    });

    it('deve retornar 1 para string vazia', () => {
      expect(periodOrder('')).toBe(1);
    });

    it('deve retornar 1 para valor desconhecido', () => {
      expect(periodOrder('weekly')).toBe(1);
    });
  });

  describe('Integração: Cenários de Upgrade Real', () => {
    it('Cenário 1: Plano anual iniciado em 17/03/2026', () => {
      const subscriptionDate = new Date('2026-03-17');
      const expiryDate = addMonths(subscriptionDate, 12);

      expect(expiryDate.toISOString().split('T')[0]).toBe('2027-03-17');

      // Verificar que são exatamente 365 dias (não 360)
      const diffMs = expiryDate.getTime() - subscriptionDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(365);
    });

    it('Cenário 2: Plano semestral iniciado em 31/01/2026', () => {
      const subscriptionDate = new Date('2026-01-31');
      const expiryDate = addMonths(subscriptionDate, 6);

      // Julho tem 31 dias, então deve ser 31/07
      expect(expiryDate.toISOString().split('T')[0]).toBe('2026-07-31');
    });

    it('Cenário 3: Upgrade gratuito com crédito pro-rata', () => {
      const subscriptionDate = new Date('2026-01-15');
      const upgradeDate = new Date('2026-06-15'); // 5 meses depois

      // Usuário tinha 12 meses, usou 5, restam 7
      const originalExpiry = addMonths(subscriptionDate, 12);
      expect(originalExpiry.toISOString().split('T')[0]).toBe('2027-01-15');

      // Com crédito, nova data de vencimento estende 7 meses a partir do upgrade
      const newExpiry = addMonths(upgradeDate, 7);
      expect(newExpiry.toISOString().split('T')[0]).toBe('2027-01-15');
    });

    it('Cenário 4: Comparação ano comercial (360) vs ano real (365)', () => {
      const date = new Date('2026-03-17');

      const comercial360 = addDays(date, 360);
      const real365 = addMonths(date, 12);

      // Ano comercial: 360 dias = 12/03/2027
      expect(comercial360.toISOString().split('T')[0]).toBe('2027-03-12');

      // Ano real: 12 meses = 17/03/2027
      expect(real365.toISOString().split('T')[0]).toBe('2027-03-17');

      // Diferença de 5 dias
      const diffMs = real365.getTime() - comercial360.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(5);
    });
  });
});
