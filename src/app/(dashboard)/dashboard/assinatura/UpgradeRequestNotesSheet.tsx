'use client';

import {
  FileText,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  TrendingUp,
  BadgeCheck,
  CalendarClock,
} from 'lucide-react';
import { Sheet, SheetSection, SheetFooter } from '@/components/ui/Sheet';
import type { UpgradeRequest } from '@/core/types/billing';

const BILLING_TYPE_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto',
  PIX: 'Pix',
  UNDEFINED: 'Não definido',
};

function formatPaymentChangeLine(line: string): string {
  const match = line.match(/\[PaymentMethodChange (.*?)\] (.*?) -> (.*)/);

  if (!match) {
    return line;
  }

  const [, timestamp, from, to] = match;

  const date = new Date(timestamp);
  const formattedDate = date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
}

export function UpgradeRequestNotesSheet({
  request,
  onClose,
}: {
  request: UpgradeRequest | null;
  onClose: () => void;
}) {
  const parsed = parseNotes(request?.notes);

  const title =
    request?.status === 'pending_downgrade' || request?.status === 'pending_cancellation'
      ? 'Cancelamento'
      : 'Observações';

  const subtitle = request
    ? `${request.plan_key_requested ?? 'Plano'} • ${request.billing_type ?? '—'}`
    : undefined;

  const headerIcon =
    request?.status === 'pending_downgrade' || request?.status === 'pending_cancellation'
      ? <AlertTriangle size={18} strokeWidth={2.5} />
      : <FileText size={18} strokeWidth={2.5} />;

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
            </div>
          </SheetSection>

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

              <SheetSection title="Logs brutos (JSON)">
                <div className="p-4 bg-petroleum rounded-luxury text-champagne font-mono text-[10px] overflow-x-auto whitespace-pre">
                  {JSON.stringify(parsed.json, null, 2)}
                </div>
              </SheetSection>
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
                        <TrendingUp
                          size={14}
                          className="text-gold mt-0.5"
                        />
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

              {!!parsed.lines?.length && (
                <SheetSection title="Outros Detalhes">
                  <div className="space-y-2">
                    {parsed.lines
                      .filter(
                        (line) =>
                          !parsed.paymentChanges?.includes(line) &&
                          !parsed.operationDetails?.includes(line),
                      )
                      .map((line, idx) => {
                      const isSync = line.toLowerCase().includes('sincronização asaas');
                      const isDashItem = line.startsWith('-');
                      return (
                        <div
                          key={`${idx}-${line}`}
                          className={`text-[11px] ${
                            isDashItem ? 'pl-4' : ''
                          } text-slate-700`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {isSync ? (
                              <RefreshCw size={12} className="text-petroleum/70" />
                            ) : null}
                            {line}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </SheetSection>
              )}

              <SheetSection title="Logs brutos (texto)">
                <div className="p-4 bg-slate-900 rounded-luxury text-slate-100 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {parsed.raw}
                </div>
              </SheetSection>
            </>
          )}

          {parsed.kind === 'empty' && (
            <SheetSection title="Sem observações">
              <p className="text-[11px] text-slate-600">Nenhum detalhe registrado.</p>
            </SheetSection>
          )}
        </>
      )}
    </Sheet>
  );
}

