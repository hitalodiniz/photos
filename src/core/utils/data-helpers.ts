import { toSaoPauloIso as toSaoPauloIsoImpl } from './date-time';

/** IANA: exibir `timestamptz`/ISO (armazenados em UTC) na UI de cobrança em horário de Brasília. */
export const BILLING_DISPLAY_TIMEZONE = 'America/Sao_Paulo' as const;

export const now = () => new Date();

/** Data e hora (pt-BR) no fuso de cobrança — ex.: coluna "Assinatura" em `tb_upgrade_requests`. */
export function formatDateTimePtBrBilling(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    timeZone: BILLING_DISPLAY_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Somente data (pt-BR) no fuso de cobrança. */
export function formatDateOnlyPtBrBilling(
  iso: string | Date | null | undefined,
): string | null {
  if (iso == null) return null;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', {
    timeZone: BILLING_DISPLAY_TIMEZONE,
  });
}

/** ISO 8601 UTC a partir de uma data (padrão: instante atual). Para gravar em banco/API. */
export function utcIsoFrom(date: Date = now()): string {
  return date.toISOString();
}

/** ISO 8601 UTC para um instante deslocado de agora (ex.: filtros por idade de registro). */
export function utcIsoOffsetFromNowMs(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

/**
 * Data/hora no fuso America/Sao_Paulo (sufixo -03:00 no ISO).
 * Ver `date-time.ts` para a implementação.
 */
export function toSaoPauloIso(date: Date = new Date()): string {
  return toSaoPauloIsoImpl(date);
}

export const getTimestamp = () => {
  const agora = new Date();
  const data = utcIsoFrom(agora).split('T')[0].replace(/-/g, ''); // 20260110
  const hora = agora.getHours().toString().padStart(2, '0');
  const min = agora.getMinutes().toString().padStart(2, '0');
  return `${data}_${hora}${min}`;
};

export const formatDateLong = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getEndOfDaySaoPauloIso = (date: Date): string => {
  const saoPauloDate = getSaoPauloDateString(date);
  return new Date(`${saoPauloDate}T23:59:59-03:00`).toISOString();
};

export const getSaoPauloDateString = (date: Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};
