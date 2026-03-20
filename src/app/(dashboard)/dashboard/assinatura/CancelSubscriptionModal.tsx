'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Banknote,
  TrendingDown,
  HelpCircle,
  ShieldAlert,
  CalendarClock,
  ChevronDown,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CancelReason =
  | 'too_expensive'
  | 'not_using'
  | 'missing_features'
  | 'switching_competitor'
  | 'temporary_pause'
  | 'technical_issues'
  | 'other';

export interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: CancelReason, comment: string) => Promise<void>;
  processedAt: string | null;
  createdAt?: string | null;
  accessEndsAt: string | null;
  planName: string;
  isLoading: boolean;
  freeMaxGalleries?: number;
  freePhotoCredits?: number;
  premiumFeatureLabels?: string[];
  /**
   * Calculado no servidor (AssinaturaContent) — leva em conta:
   * 1. Estar dentro de 7 dias (created_at / processed_at)
   * 2. NÃO ter sido um upgrade com crédito pro-rata (notes contém "aproveitamento de crédito")
   * 3. amount_final > 0 (houve desembolso real)
   * Quando false: modal mostra fluxo "cancelar e manter até o fim do ciclo".
   */
  hasRefundRight?: boolean;
}

// ─── Motivos ─────────────────────────────────────────────────────────────────

export const CANCEL_REASONS: {
  value: CancelReason;
  label: string;
  icon: string;
}[] = [
  { value: 'too_expensive', label: 'Preço muito alto', icon: '💸' },
  { value: 'not_using', label: 'Não estou usando o suficiente', icon: '😴' },
  { value: 'missing_features', label: 'Falta algum recurso', icon: '🔧' },
  {
    value: 'switching_competitor',
    label: 'Vou usar outra plataforma',
    icon: '🔄',
  },
  { value: 'temporary_pause', label: 'Pausa temporária', icon: '⏸️' },
  { value: 'technical_issues', label: 'Problemas técnicos', icon: '⚠️' },
  { value: 'other', label: 'Outro motivo', icon: '💬' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatCredits(n: number): string {
  return n >= 1000 ? `${Math.floor(n / 1000)}k` : String(n);
}

const STEP_SUBTITLES = [
  'Etapa 1 de 3 — Motivo',
  'Etapa 2 de 3 — O que vai acontecer',
  'Etapa 3 de 3 — Confirmação',
];

const BODY_HEIGHT = 'min-h-[300px]';

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════════════════════

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  processedAt,
  createdAt,
  accessEndsAt,
  planName,
  isLoading,
  freeMaxGalleries = 3,
  freePhotoCredits = 500,
  premiumFeatureLabels = [],
  hasRefundRight = false,
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [comment, setComment] = useState('');

  // hasRefundRight vem calculado do servidor — é a fonte da verdade
  const withinRefund = hasRefundRight;

  const reset = () => {
    setStep(1);
    setReason(null);
    setComment('');
  };
  const handleClose = () => {
    if (isLoading) return;
    reset();
    onClose();
  };
  const handleConfirm = async () => {
    if (!reason) return;
    await onConfirm(reason, comment.trim());
    reset();
  };

  const featureText =
    premiumFeatureLabels.length > 0
      ? premiumFeatureLabels.length <= 4
        ? premiumFeatureLabels.join(', ')
        : `${premiumFeatureLabels.slice(0, 3).join(', ')} e mais`
      : 'Perfil Profissional, Estatísticas avançadas e mais';

  const selectedReason = CANCEL_REASONS.find((r) => r.value === reason);

  // ── Footer ────────────────────────────────────────────────────────────────

  const footer = (
    <div className="flex gap-2 py-3">
      {step > 1 && (
        <button
          type="button"
          onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
          disabled={isLoading}
          className="btn-secondary-white"
        >
          <ChevronLeft size={12} />
          Voltar
        </button>
      )}

      {step < 3 ? (
        <button
          type="button"
          disabled={!reason}
          onClick={() => setStep((s) => (s + 1) as 2 | 3)}
          className="btn-luxury-primary w-full"
        >
          Continuar
          <ChevronRight size={12} />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading || !reason}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md bg-red-500 hover:bg-red-600 text-white font-semibold text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-red-900/30"
        >
          {isLoading ? (
            <>
              <RefreshCw size={12} className="animate-spin" /> Cancelando…
            </>
          ) : (
            <>
              <AlertTriangle size={12} /> Confirmar cancelamento
            </>
          )}
        </button>
      )}
    </div>
  );

  // ── Progress bar ──────────────────────────────────────────────────────────

  const topBanner = (
    <div className="px-5 py-2 bg-petroleum/90">
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-400 rounded-full transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar assinatura"
      subtitle={STEP_SUBTITLES[step - 1]}
      maxWidth="xl"
      showCloseButton={!isLoading}
      footer={footer}
      topBanner={topBanner}
    >
      <div className={`${BODY_HEIGHT} flex flex-col`}>
        {/* ── Step 1 — Motivo ── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 gap-4">
            {/* Select do motivo - com shrink-0 */}
            <div className="space-y-1.5 shrink-0">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-800">
                Motivo principal
              </label>
              <div className="relative">
                <select
                  value={reason ?? ''}
                  onChange={(e) =>
                    setReason((e.target.value as CancelReason) || null)
                  }
                  className={`w-full appearance-none px-3 py-2.5 pr-9 h-10 bg-slate-50 border-2 rounded-md text-[12px] font-semibold outline-none cursor-pointer transition-colors ${
                    reason
                      ? 'border-red-300 text-petroleum'
                      : 'border-slate-200 text-slate-800'
                  } focus:border-red-300`}
                >
                  <option value="" disabled>
                    Selecione um motivo…
                  </option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.icon} {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-800 pointer-events-none"
                />
              </div>
            </div>

            {/* Container do textarea - ADICIONAR overflow-hidden */}
            <div className="flex flex-col flex-1 gap-1.5 min-h-0 overflow-hidden">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-800 shrink-0">
                Comentário adicional{' '}
                <span className="font-normal normal-case text-slate-700">
                  (opcional)
                </span>
              </label>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Descreva o que poderia ser melhorado, o que sentiu falta ou qualquer outro detalhe que queira compartilhar…"
                maxLength={400}
                className="flex-1 w-full min-h-0 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-petroleum outline-none resize-none focus:border-slate-300 transition-colors placeholder:text-slate-500 leading-relaxed"
              />

              <p
                className={`text-[8px] text-right tabular-nums transition-colors shrink-0 ${
                  comment.length > 350 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {comment.length}/400
              </p>
            </div>
          </div>
        )}
        {/* ── Step 2 — Consequências ── */}
        {step === 2 && (
          <div className="flex flex-col h-full justify-between">
            <div className="divide-y divide-slate-100">
              {/* ── DENTRO DOS 7 DIAS COM DIREITO A ESTORNO ── */}
              {withinRefund && (
                <>
                  {/* Linha 1 — estorno total */}
                  <div className="flex items-start gap-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Banknote size={17} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-petroleum leading-tight">
                        Opção A — Cancelamento com estorno total
                      </p>
                      <p className="text-[12px] text-slate-800 mt-0.5 leading-relaxed">
                        Você está dentro do prazo de 7 dias (Art. 49 CDC). O
                        valor integral pago será estornado para a forma de
                        pagamento original em até 48h úteis. O plano encerra
                        imediatamente.
                      </p>
                    </div>
                  </div>

                  {/* Linha 2 — alternativa downgrade */}
                  <div className="flex items-start gap-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <TrendingDown size={17} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-petroleum leading-tight">
                        Opção B disponível — Downgrade com crédito pro-rata
                      </p>
                      <p className="text-[12px] text-slate-800 mt-0.5 leading-relaxed">
                        Prefere manter um plano inferior em vez de cancelar
                        tudo? Feche este modal, acesse o Upgrade e escolha o
                        plano desejado. O crédito dos dias não usados será
                        aplicado automaticamente — sem estorno.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ── FORA DOS 7 DIAS OU SEM DIREITO A ESTORNO ── */}
              {!withinRefund && (
                <>
                  {/* Linha 1 — acesso mantido até o vencimento */}
                  <div className="flex items-start gap-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <CalendarClock size={17} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-petroleum leading-tight">
                        Acesso garantido até {formatDate(accessEndsAt)}
                      </p>
                      <p className="text-[12px] text-slate-800 mt-0.5 leading-relaxed">
                        Ao confirmar o cancelamento, sua assinatura não será
                        renovada. Você mantém acesso completo ao plano{' '}
                        <strong className="text-petroleum">{planName}</strong>{' '}
                        até o fim do ciclo pago. Após essa data, o plano é
                        migrado automaticamente para FREE.
                      </p>
                    </div>
                  </div>

                  {/* Linha 2 — sem estorno */}
                  <div className="flex items-start gap-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <HelpCircle size={17} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-petroleum leading-tight">
                        Sem direito a estorno
                      </p>
                      <p className="text-[12px] text-slate-800 mt-0.5 leading-relaxed">
                        Cancelamentos após 7 dias da contratação não geram
                        estorno, conforme nossa{' '}
                        <a
                          href="/politica-cancelamento"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold underline hover:text-gold/70 transition-colors"
                        >
                          política de cancelamento
                        </a>
                        . Você aproveita todos os benefícios do plano até o
                        vencimento, sem nenhuma cobrança adicional.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Linha 3 — downgrade automático de conteúdo (sempre visível) */}
              <div className="flex items-start gap-4 py-4">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <ShieldAlert size={17} className="text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-petroleum leading-tight">
                    Downgrade automático de conteúdo
                  </p>
                  <p className="text-[12px] text-slate-800 mt-0.5 leading-relaxed">
                    {withinRefund
                      ? 'Imediatamente após o cancelamento, g'
                      : `Em ${formatDate(accessEndsAt)}, g`}
                    alerias acima de{' '}
                    <strong className="text-petroleum">
                      {freeMaxGalleries}
                    </strong>{' '}
                    e fotos acima de{' '}
                    <strong className="text-petroleum">
                      {formatCredits(freePhotoCredits)}
                    </strong>{' '}
                    serão arquivadas e sairão do ar. Recursos como{' '}
                    <strong className="text-petroleum">{featureText}</strong>{' '}
                    serão desabilitados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ── Step 3 — Confirmação ── */}
        {step === 3 && (
          <div className="flex flex-col h-full gap-3">
            <p className="text-[12px] text-petroleum/90 leading-relaxed shrink-0">
              Você está prestes a cancelar o plano{' '}
              <strong className="text-petroleum">{planName}</strong>.{' '}
              {withinRefund
                ? 'O plano será encerrado imediatamente (FREE) e o estorno total será processado em até 48h.'
                : `Sua assinatura não será renovada. Você mantém acesso completo até ${formatDate(accessEndsAt)}.`}
            </p>

            {/* Tabela resumo */}
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shrink-0">
              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-800">
                  Motivo
                </span>
                <span className="text-[11px] font-semibold text-petroleum">
                  {selectedReason?.label}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-800">
                  Estorno
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    withinRefund ? 'text-emerald-600' : 'text-slate-500'
                  }`}
                >
                  {withinRefund ? 'Sim — em até 48h' : 'Não aplicável'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-800">
                  {withinRefund
                    ? 'Acesso após cancelar'
                    : 'Acesso garantido até'}
                </span>
                <span className="text-[11px] font-semibold text-petroleum">
                  {withinRefund ? 'Encerrado (FREE)' : formatDate(accessEndsAt)}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-800">
                  Downgrade de conteúdo
                </span>
                <span className="text-[11px] font-semibold text-amber-600">
                  {withinRefund ? 'Imediato' : `Em ${formatDate(accessEndsAt)}`}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-800">
                  Renovação automática
                </span>
                <span className="text-[11px] font-semibold text-red-500">
                  Cancelada
                </span>
              </div>
            </div>

            {/* Comentário */}
            <div className="flex flex-col flex-1 gap-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-800">
                {comment ? 'Seu comentário' : 'Comentário'}
              </p>
              {comment ? (
                <div className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 overflow-y-auto">
                  <p className="text-[11px] text-petroleum/90 leading-snug italic">
                    "{comment}"
                  </p>
                </div>
              ) : (
                <div className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <p className="text-[11px] text-slate-300">
                    Nenhum comentário informado
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-800 leading-snug shrink-0 font-medium">
              Esta ação não pode ser desfeita. Você poderá reativar ou assinar
              um novo plano a qualquer momento.{' '}
              <a
                href="/politica-cancelamento"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline hover:text-gold/70 transition-colors"
              >
                Ver política de cancelamento
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
