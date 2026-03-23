'use client';

import {
  FileText,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  TrendingUp,
  BadgeCheck,
  CalendarClock,
  Banknote,
  Tag,
  Timer,
} from 'lucide-react';
import { Sheet, SheetSection, SheetFooter } from '@/components/ui/Sheet';
import type { UpgradeRequest } from '@/core/types/billing';
import { CANCEL_REASONS } from './CancelSubscriptionModal';

const BILLING_TYPE_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto',
  PIX: 'Pix',
  UNDEFINED: 'Não definido',
};

const SAO_PAULO_TZ = 'America/Sao_Paulo';

function toFriendlySaoPauloDateTime(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleString('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatLineDatesToSaoPaulo(line: string): string {
  const isoRegex = /\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g;
  return line.replace(isoRegex, (match) => {
    // Datas sem horário ficam em formato amigável sem aplicar deslocamento.
    if (/^\d{4}-\d{2}-\d{2}$/.test(match)) {
      const [y, m, d] = match.split('-');
      return `${d}/${m}/${y}`;
    }
    return toFriendlySaoPauloDateTime(match);
  });
}

function formatPaymentChangeLine(line: string): string {
  const match = line.match(/\[PaymentMethodChange (.*?)\] (.*?) -> (.*)/);

  if (!match) {
    return line;
  }

  const [, timestamp, from, to] = match;

  const formattedDate = toFriendlySaoPauloDateTime(timestamp);

  const fromLabel = BILLING_TYPE_LABELS[from.trim()] ?? from.trim();
  const toLabel = BILLING_TYPE_LABELS[to.trim()] ?? to.trim();

  return `Troca de método em ${formattedDate.replace(
    ',',
    ' às',
  )}: de ${fromLabel} para ${toLabel}`;
}

type NotesKind = 'empty' | 'json' | 'text';

function parseNotes(notes: string | null | undefined): {
  kind: NotesKind;
  raw: string;
  json?: Record<string, unknown>;
  lines?: string[];
  paymentChanges?: string[];
  operationDetails?: string[];
} {
  const raw = (notes ?? '').trim();
  if (!raw) return { kind: 'empty', raw: '' };

  if (raw.startsWith('{')) {
    try {
      const json = JSON.parse(raw) as Record<string, unknown>;
      return { kind: 'json', raw, json };
    } catch {
      // fallthrough to text
    }
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const paymentChanges = lines.filter((l) =>
    l.startsWith('[PaymentMethodChange '),
  );
  const operationDetails = lines.filter(
    (l) =>
      l.toLowerCase().includes('aproveitamento de crédito') ||
      l.toLowerCase().includes('upgrade gratuito'),
  );

  return { kind: 'text', raw, lines, paymentChanges, operationDetails };
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    pending: 'Aguardando Pagamento',
    processing: 'Processando',
    approved: 'Aprovado',
    pending_cancellation: 'Cancelamento Agendado',
    pending_downgrade: 'Downgrade Agendado',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
  };
  return map[status] ?? status;
}

function formatDateTime(iso?: unknown): string {
  if (typeof iso !== 'string') return '—';
  return toFriendlySaoPauloDateTime(iso);
}

function formatDateOnly(iso?: string | null): string | null {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TZ });
}

function formatCurrency(value?: number | null): string {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function billingPeriodLabel(period?: string | null): string {
  if (period === 'semiannual') return 'Semestral';
  if (period === 'annual') return 'Anual';
  return 'Mensal';
}

function parseIsoDateFromLine(line: string): string | null {
  const match = line.match(/\b(\d{4}-\d{2}-\d{2}(?:T[0-9:.+-Z]*)?)\b/);
  return match?.[1] ?? null;
}

function extractAsaasFieldsFromText(lines: string[]): {
  nextDueDate?: string;
  endDate?: string;
} {
  let nextDueDate: string | undefined;
  let endDate: string | undefined;

  for (const line of lines) {
    const nextDueMatch = line.match(/nextDueDate[:\s]+(\d{4}-\d{2}-\d{2})/i);
    if (!nextDueDate && nextDueMatch?.[1]) nextDueDate = nextDueMatch[1];

    const endDateMatch = line.match(/endDate[:\s]+(\d{4}-\d{2}-\d{2})/i);
    if (!endDate && endDateMatch?.[1]) endDate = endDateMatch[1];
  }

  return { nextDueDate, endDate };
}

type TimelineEvent = {
  title: string;
  description: string;
  date?: string | null;
  tone?: 'default' | 'warning' | 'info';
};

function buildTimeline(request: UpgradeRequest, parsed: ReturnType<typeof parseNotes>): TimelineEvent[] {
  const lines = parsed.lines ?? [];
  const events: TimelineEvent[] = [];

  events.push({
    title: 'Solicitação criada',
    description: `Pedido para o plano ${request.plan_key_requested}.`,
    date: request.created_at,
    tone: 'default',
  });

  if (request.processed_at) {
    events.push({
      title: 'Solicitação processada',
      description: `Status definido como ${statusLabel(request.status)}.`,
      date: request.processed_at,
      tone: 'info',
    });
  }

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('cancelamento solicitado')) {
      events.push({
        title: 'Cancelamento/downgrade agendado',
        description: formatLineDatesToSaoPaulo(line),
        date: parseIsoDateFromLine(line),
        tone: 'warning',
      });
    } else if (lower.includes('sincronização asaas')) {
      events.push({
        title: 'Sincronização com Asaas',
        description: formatLineDatesToSaoPaulo(line),
        date: parseIsoDateFromLine(line),
        tone: 'info',
      });
    } else if (lower.includes('nova data de vencimento')) {
      events.push({
        title: 'Vencimento recalculado',
        description: formatLineDatesToSaoPaulo(line),
        date: parseIsoDateFromLine(line),
        tone: 'info',
      });
    }
  }

  return events;
}

export function UpgradeRequestNotesSheet({
  request,
  onClose,
}: {
  request: UpgradeRequest | null;
  onClose: () => void;
}) {
  const parsed = parseNotes(request?.notes);
  const timeline = request ? buildTimeline(request, parsed) : [];
  const noteLines = parsed.lines ?? [];
  const asaasFieldsFromText = extractAsaasFieldsFromText(noteLines);
  const scheduleLines = noteLines.filter(
    (line) =>
      !parsed.paymentChanges?.includes(line) &&
      !parsed.operationDetails?.includes(line),
  );
  const hasScheduledChange = request?.status === 'pending_change';
  const asaasNextDueDate =
    asaasFieldsFromText.nextDueDate ?? (hasScheduledChange ? request?.processed_at?.slice(0, 10) : undefined);

  const title =
    request?.status === 'pending_downgrade' ||
    request?.status === 'pending_cancellation'
      ? 'Cancelamento'
      : 'Observações';

  const subtitle = request
    ? `${request.plan_key_requested ?? 'Plano'} • ${request.billing_type ?? '—'}`
    : undefined;

  const headerIcon =
    request?.status === 'pending_downgrade' ||
    request?.status === 'pending_cancellation' ? (
      <AlertTriangle size={18} strokeWidth={2.5} />
    ) : (
      <FileText size={18} strokeWidth={2.5} />
    );

  return (
    <Sheet
      isOpen={!!request}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={headerIcon}
      headerClassName="bg-petroleum"
      maxWidth="lg"
      position="right"
      footer={
        <SheetFooter className="bg-slate-50 border-t border-slate-100">
          <p className="text-[9px] text-slate-400 italic">
            Registro interno do sistema (notes)
          </p>
        </SheetFooter>
      }
    >
      {request && (
        <>
          <SheetSection title="Resumo">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-luxury border border-slate-100 flex items-start gap-2">
                <BadgeCheck size={14} className="text-gold mt-0.5" />
                <div>
                  <p className="text-[8px] text-slate-400 font-semibold uppercase mb-1">
                    Status
                  </p>
                  <p className="text-[11px] font-medium text-petroleum">
                    {statusLabel(request.status)}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-luxury border border-slate-100 flex items-start gap-2">
                <CalendarClock size={14} className="text-gold mt-0.5" />
                <div>
                  <p className="text-[8px] text-slate-400 font-semibold uppercase mb-1">
                    Processado em
                  </p>
                  <p className="text-[11px] font-medium text-petroleum">
                    {formatDateTime(request.processed_at)}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-luxury border border-slate-100 flex items-start gap-2">
                <Banknote size={14} className="text-gold mt-0.5" />
                <div>
                  <p className="text-[8px] text-slate-400 font-semibold uppercase mb-1">
                    Valor desta operação
                  </p>
                  <p className="text-[11px] font-medium text-petroleum">
                    {formatCurrency(request.amount_final)}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-luxury border border-slate-100 flex items-start gap-2">
                <Tag size={14} className="text-gold mt-0.5" />
                <div>
                  <p className="text-[8px] text-slate-400 font-semibold uppercase mb-1">
                    Ciclo e pagamento
                  </p>
                  <p className="text-[11px] font-medium text-petroleum">
                    {billingPeriodLabel(request.billing_period)} •{' '}
                    {BILLING_TYPE_LABELS[request.billing_type] ?? request.billing_type}
                  </p>
                </div>
              </div>
            </div>
          </SheetSection>

          <SheetSection title="Leitura rápida da cobrança">
            <div className="p-3 bg-amber-50 rounded-luxury border border-amber-100 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold text-amber-900 px-2 py-1 rounded-full bg-amber-100 border border-amber-200">
                  Cobrança: {formatCurrency(request.amount_final)}
                </span>
                <span className="text-[10px] font-semibold text-amber-900 px-2 py-1 rounded-full bg-amber-100 border border-amber-200">
                  Ciclo: {billingPeriodLabel(request.billing_period)}
                </span>
                {hasScheduledChange && (
                  <span className="text-[10px] font-semibold text-amber-900 px-2 py-1 rounded-full bg-amber-100 border border-amber-200">
                    Alteração agendada
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-900/90">
                Este registro mostra o valor da operação desta linha, não
                necessariamente a última cobrança já efetivada da assinatura vigente.
              </p>
              {(asaasNextDueDate || asaasFieldsFromText.endDate) && (
                <div className="flex flex-col gap-1 text-[11px] text-amber-900/90">
                  {asaasNextDueDate && (
                    <p>
                      <span className="font-semibold">Próxima cobrança (Asaas):</span>{' '}
                      {formatDateOnly(asaasNextDueDate) ?? asaasNextDueDate}
                    </p>
                  )}
                  {asaasFieldsFromText.endDate && (
                    <p>
                      <span className="font-semibold">Fim da assinatura (Asaas):</span>{' '}
                      {formatDateOnly(asaasFieldsFromText.endDate) ??
                        asaasFieldsFromText.endDate}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SheetSection>

          {!!timeline.length && (
            <SheetSection title="Linha do tempo">
              <div className="space-y-2">
                {timeline.map((event, idx) => {
                  const toneClass =
                    event.tone === 'warning'
                      ? 'bg-amber-50 border-amber-100 text-amber-900'
                      : event.tone === 'info'
                        ? 'bg-blue-50 border-blue-100 text-blue-900'
                        : 'bg-slate-50 border-slate-100 text-slate-800';
                  return (
                    <div
                      key={`${event.title}-${idx}`}
                      className={`p-3 rounded-luxury border ${toneClass}`}
                    >
                      <div className="flex items-start gap-2">
                        <Timer size={14} className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold">{event.title}</p>
                          <p className="text-[11px]">{event.description}</p>
                          {event.date && (
                            <p className="text-[10px] opacity-80 mt-1">
                              {formatDateTime(event.date)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SheetSection>
          )}

          {parsed.kind === 'json' && parsed.json && (
            <>
              <SheetSection title="Detalhes do cancelamento">
                <div className="space-y-2 text-[11px] text-slate-700">
                  <div className="flex items-center gap-2 font-medium text-petroleum">
                    <AlertTriangle size={14} className="text-gold" />
                    {String(parsed.json.reason ?? 'Cancelamento')}
                  </div>
                  {parsed.json.comment && (
                    <p className="text-slate-700">
                      <span className="font-medium">Comentário:</span>{' '}
                      {String(parsed.json.comment)}
                    </p>
                  )}
                  {parsed.json.detail && (
                    <p className="text-slate-700">
                      <span className="font-medium">Detalhe:</span>{' '}
                      {String(parsed.json.detail)}
                    </p>
                  )}
                </div>
              </SheetSection>

              {/* <SheetSection title="Logs brutos (JSON)">
                <div className="p-4 bg-petroleum rounded-luxury text-champagne font-mono text-[10px] overflow-x-auto whitespace-pre">
                  {JSON.stringify(parsed.json, null, 2)}
                </div>
              </SheetSection> */}
            </>
          )}

          {parsed.kind === 'text' && (
            <>
              {!!parsed.operationDetails?.length && (
                <SheetSection title="Detalhes da Operação">
                  <div className="space-y-2">
                    {parsed.operationDetails.map((line) => (
                      <div
                        key={line}
                        className="p-3 bg-slate-50 rounded-luxury border border-slate-100 flex items-start gap-2"
                      >
                        <TrendingUp size={14} className="text-gold mt-0.5" />
                        <p className="text-[11px] text-slate-700 font-medium">
                          {line}
                        </p>
                      </div>
                    ))}
                  </div>
                </SheetSection>
              )}

              {!!parsed.paymentChanges?.length && (
                <SheetSection title="Mudanças de pagamento">
                  <div className="space-y-2">
                    {parsed.paymentChanges.map((line) => (
                      <div
                        key={line}
                        className="p-3 bg-slate-50 rounded-luxury border border-slate-100 flex items-start gap-2"
                      >
                        <CreditCard size={14} className="text-gold mt-0.5" />
                        <p className="text-[11px] text-slate-700 font-medium">
                          {formatPaymentChangeLine(line)}
                        </p>
                      </div>
                    ))}
                  </div>
                </SheetSection>
              )}

              {!!scheduleLines.length && (
                <SheetSection title="Detalhes do Agendamento">
                  <div className="space-y-3">
                    {scheduleLines.map((line, idx) => {
                        // Detecta se é a linha de log de cancelamento solicitado
                        const cancelMatch = line.match(
                          /Cancelamento solicitado em (.*?)Z\. Acesso até (.*?)Z/,
                        );
                        const reasonMatch = line.match(/Motivo: (.*)/);

                        if (cancelMatch) {
                          const [, requestedAt, expiresAt] = cancelMatch;
                          const formatDate = (iso: string) =>
                            formatDateOnly(`${iso}Z`) ?? formatLineDatesToSaoPaulo(iso);

                          return (
                            <div
                              key={idx}
                              className="p-3 bg-amber-50 rounded-luxury border border-amber-100 space-y-2"
                            >
                              <div className="flex items-center gap-2 text-[11px] text-amber-800 font-bold uppercase tracking-tight">
                                <CalendarClock size={14} />
                                Ciclo de cancelamento
                              </div>
                              <div className="grid grid-cols-1 gap-1 text-[11px] text-amber-900/70">
                                <p>
                                  • Solicitado em:{' '}
                                  <span className="font-semibold">
                                    {formatDate(requestedAt)}
                                  </span>
                                </p>
                                <p>
                                  • Acesso garantido até:{' '}
                                  <span className="font-semibold text-amber-900">
                                    {formatDate(expiresAt)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          );
                        }

                        if (reasonMatch) {
                          const reasonKey = reasonMatch[1].trim();
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-slate-50 rounded-luxury border border-slate-100"
                            >
                              <p className="text-[8px] text-slate-400 font-semibold uppercase mb-1">
                                Motivo do Usuário
                              </p>
                              <p className="text-[11px] text-petroleum font-medium">
                                {CANCEL_REASONS[reasonKey] || reasonKey}
                              </p>
                            </div>
                          );
                        }

                        // Renderização padrão para outras linhas (como Comentários)
                        const isSync = line
                          .toLowerCase()
                          .includes('sincronização asaas');
                        const isComment = line.startsWith('Comentário:');
                        const friendlyLine = formatLineDatesToSaoPaulo(line);

                        return (
                          <div
                            key={`${idx}-${line}`}
                            className={`p-3 rounded-luxury border border-slate-100 ${
                              isComment ? 'bg-white italic' : 'bg-slate-50'
                            }`}
                          >
                            <span className="flex items-start gap-2 text-[11px] text-slate-700">
                              {isSync && (
                                <RefreshCw
                                  size={12}
                                  className="text-petroleum/70 mt-0.5"
                                />
                              )}
                              {friendlyLine.replace(
                                'Comentário:',
                                '💬 Observação:',
                              )}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </SheetSection>
              )}

              {/* <SheetSection title="Logs brutos (texto)">
                <div className="p-4 bg-slate-900 rounded-luxury text-slate-100 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {parsed.raw}
                </div>
              </SheetSection> */}
            </>
          )}

          {parsed.kind === 'empty' && (
            <SheetSection title="Sem observações">
              <p className="text-[11px] text-slate-600">
                Nenhum detalhe registrado.
              </p>
            </SheetSection>
          )}
        </>
      )}
    </Sheet>
  );
}
