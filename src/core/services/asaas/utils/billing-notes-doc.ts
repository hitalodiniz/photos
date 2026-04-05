/**
 * Notas de `tb_upgrade_requests`: JSON versionado (`BillingNotesDocV1`) com `log[]`
 * e flags de negócio. Apenas este formato é aceito na leitura/escrita.
 */

export const BILLING_NOTES_VERSION = 1 as const;

export type BillingNotesDocV1 = {
  v: typeof BILLING_NOTES_VERSION;
  /** Definitivo: contratação com abatimento pro-rata — não estorno por arrependimento */
  noRefundCreditProRata?: boolean;
  /** Definitivo: upgrade gratuito (crédito) */
  noRefundFreeCreditUpgrade?: boolean;
  /** Linhas de histórico */
  log: string[];
};

export function isBillingNotesDocV1(value: unknown): value is BillingNotesDocV1 {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    o.v === BILLING_NOTES_VERSION &&
    Array.isArray(o.log) &&
    o.log.every((x) => typeof x === 'string')
  );
}

/**
 * Documento vazio para notas ausentes.
 * Texto não vazio que não seja JSON v1 válido lança erro.
 */
export function parseBillingNotesDoc(raw: string | null | undefined): BillingNotesDocV1 {
  const s = (raw ?? '').trim();
  if (!s) return { v: 1, log: [] };
  let o: unknown;
  try {
    o = JSON.parse(s);
  } catch {
    throw new Error('billing notes: JSON inválido');
  }
  if (!isBillingNotesDocV1(o)) {
    throw new Error('billing notes: esperado documento v1 { v: 1, log: string[] }');
  }
  return {
    v: 1,
    log: [...o.log],
    ...(o.noRefundCreditProRata ? { noRefundCreditProRata: true } : {}),
    ...(o.noRefundFreeCreditUpgrade ? { noRefundFreeCreditUpgrade: true } : {}),
  };
}

export function serializeBillingNotesDoc(doc: BillingNotesDocV1): string {
  const payload: Record<string, unknown> = {
    v: BILLING_NOTES_VERSION,
    log: doc.log,
  };
  if (doc.noRefundCreditProRata === true)
    payload.noRefundCreditProRata = true;
  if (doc.noRefundFreeCreditUpgrade === true)
    payload.noRefundFreeCreditUpgrade = true;
  return JSON.stringify(payload);
}

/** Texto plano derivado do `log` (para regex / UI). Entrada inválida → string vazia. */
export function billingNotesDisplayText(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  try {
    return parseBillingNotesDoc(s).log.join('\n');
  } catch {
    return '';
  }
}

export function appendBillingNotesBlock(
  raw: string | null | undefined,
  block: string,
  flagBump?: Pick<
    BillingNotesDocV1,
    'noRefundCreditProRata' | 'noRefundFreeCreditUpgrade'
  >,
): string {
  const doc = parseBillingNotesDoc(raw);
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) doc.log.push(line);
  if (flagBump?.noRefundCreditProRata) doc.noRefundCreditProRata = true;
  if (flagBump?.noRefundFreeCreditUpgrade) doc.noRefundFreeCreditUpgrade = true;
  return serializeBillingNotesDoc(doc);
}

export function createBillingNotesForNewUpgradeRequest(params: {
  logBody: string;
  noRefundCreditProRata?: boolean;
  noRefundFreeCreditUpgrade?: boolean;
}): string {
  const body = params.logBody.trim();
  const log = body
    ? body
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  const doc: BillingNotesDocV1 = {
    v: 1,
    log,
    ...(params.noRefundCreditProRata ? { noRefundCreditProRata: true } : {}),
    ...(params.noRefundFreeCreditUpgrade
      ? { noRefundFreeCreditUpgrade: true }
      : {}),
  };
  return serializeBillingNotesDoc(doc);
}

/** Renovação: herda flags da linha-mãe (mesma assinatura Asaas). */
export function billingNotesForRenewalFromParent(
  parentNotes: string | null | undefined,
  renewalLogLine: string,
): string {
  const parent = parseBillingNotesDoc(parentNotes);
  const doc: BillingNotesDocV1 = {
    v: 1,
    log: [renewalLogLine.trim()].filter(Boolean),
    ...(parent.noRefundCreditProRata ? { noRefundCreditProRata: true } : {}),
    ...(parent.noRefundFreeCreditUpgrade
      ? { noRefundFreeCreditUpgrade: true }
      : {}),
  };
  return serializeBillingNotesDoc(doc);
}

export function billingNotesBlocksRefund(notes: string | null | undefined): boolean {
  if (!(notes ?? '').trim()) return false;
  try {
    const d = parseBillingNotesDoc(notes);
    return (
      d.noRefundCreditProRata === true || d.noRefundFreeCreditUpgrade === true
    );
  } catch {
    return false;
  }
}
