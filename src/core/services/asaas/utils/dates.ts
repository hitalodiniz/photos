// src/core/services/asaas/utils/dates.ts

/**
 * Adiciona N meses a uma data preservando o dia original.
 *
 * Importante para billing:
 * - Esta função retorna a **data da próxima fatura** (início do novo ciclo),
 *   não a data de vencimento do ciclo atual.
 * - Ex.: ciclo anual iniciado em 17/03/2026 vence em 16/03/2027,
 *   e a próxima fatura é em 17/03/2027 → `addMonths(17/03/2026, 12) = 17/03/2027`.
 *
 * Implementação:
 * - Usa sempre componentes UTC para evitar efeitos de fuso horário ou DST.
 * - Quando o mês de destino não tem o mesmo dia (ex.: 31 → fevereiro),
 *   faz clamp para o último dia do mês de destino (data da próxima fatura).
 *
 * Exemplos:
 * - 17/03/2026 + 12 meses = 17/03/2027 ✅ (próxima fatura)
 * - 31/01/2026 + 1 mês = 28/02/2026 (próxima fatura; vencimento seria 27/02)
 * - 29/02/2024 + 12 meses = 28/02/2025 (próxima fatura; 2025 não é bissexto)
 */
export function addMonths(date: Date, n: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const monthIndex = month + n;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;

  // Último dia do mês de destino em UTC
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  // Cria nova data em UTC (meia-noite), garantindo ISO yyyy-mm-dd previsível
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay, 0, 0, 0, 0));
}

/**
 * Adiciona N dias a uma data.
 *
 * @param date Data base
 * @param n Quantidade de dias a adicionar (pode ser decimal, será arredondado)
 * @returns Nova data com N dias adicionados
 */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(n));
  return d;
}

/**
 * Converte billing period para número de meses.
 *
 * @param period Período de cobrança ('monthly', 'semiannual', 'annual')
 * @returns Número de meses (1, 6 ou 12)
 */
export function billingPeriodToMonths(
  period: string | null | undefined,
): number {
  if (period === 'semiannual') return 6;
  if (period === 'annual') return 12;
  return 1;
}

/**
 * Extrai a data de vencimento gravada nas notes (upgrade/crédito).
 * Formatos aceitos:
 * - "Nova data de vencimento: <ISO>"
 * - "Próximo vencimento do plano: YYYY-MM-DD"
 *
 * @param notes String de notas do upgrade request
 * @returns Data extraída ou null se não encontrada/inválida
 */
export function parseExpiryFromNotes(
  notes: string | null | undefined,
): Date | null {
  if (!notes?.trim()) return null;
  const match =
    notes.match(/Nova data de vencimento:\s*([^\s.]+)/i) ??
    notes.match(/Pr[oó]ximo vencimento do plano:\s*([^\s.]+)/i);
  if (!match?.[1]) return null;
  const raw = match[1].trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0));
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Retorna a ordem numérica de um período de cobrança.
 * Usado para comparações (ex: verificar se é upgrade ou downgrade).
 *
 * @param p Período de cobrança
 * @returns Número de meses (1, 6 ou 12)
 */
export function periodOrder(p: string): number {
  if (p === 'annual') return 12;
  if (p === 'semiannual') return 6;
  return 1;
}
