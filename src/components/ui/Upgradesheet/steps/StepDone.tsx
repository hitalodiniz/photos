'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Sparkles,
  QrCode,
  FileText,
  CreditCard,
  Copy,
  Check,
  Clock,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  MessageCircle,
  CalendarCheck,
  ChevronRight,
  Banknote,
} from 'lucide-react';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { getUpgradeRequestStatus } from '@/core/services/asaas.service';
import BaseModal from '@/components/ui/BaseModal';
import { useRouter } from 'next/navigation';
import { formatBRL, formatDatePtBr, formatDateLong } from '../utils';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PIX_EXPIRY_SECONDS = 5 * 60; // 5 minutos (Asaas padrão)
const WHATSAPP_SUPPORT = '5531993522018';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimer(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getBoletoVencimento(days = 3) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('pt-BR');
}

// ─── Sub-componente: resumo do pedido ────────────────────────────────────────

function OrderSummary({
  planName,
  period,
  amount,
}: {
  planName: string;
  period: string;
  amount?: number | null;
}) {
  const periodLabel: Record<string, string> = {
    monthly: 'Mensal',
    semiannual: 'Semestral',
    annual: 'Anual',
  };

  return (
    <div className="w-full bg-petroleum/5 rounded-xl border border-petroleum/10 px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-left min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-petroleum/80">
          Contratado
        </p>
        <p className="text-[13px] font-bold text-petroleum truncate">
          Plano {planName} · {periodLabel[period] ?? period}
        </p>
      </div>
      {amount != null && amount > 0 && (
        <p className="text-[15px] font-bold text-petroleum shrink-0">
          {formatBRL(amount)}
        </p>
      )}
    </div>
  );
}

// ─── Sub-componente: próximos passos ─────────────────────────────────────────

function NextStep({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5 text-left">
      <div className="flex items-center justify-center shrink-0">
        <Icon size={14} className="text-gold" />
      </div>
      <p className="text-[12px] font-medium text-petroleum/90 leading-snug">
        {text}
      </p>
    </div>
  );
}

// ─── Sub-componente: selo de segurança ───────────────────────────────────────

function SecurityBadge() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-1.5 text-petroleum/60">
        <ShieldCheck size={11} className="text-emerald-600" />
        <span className="text-[9px] font-bold uppercase tracking-wider">
          Pagamento seguro · Processado pela Asaas
        </span>
      </div>

      <p className="text-[9px] text-petroleum/90 max-w-[350px] text-center leading-tight ">
        Seus dados são protegidos por criptografia SSL. O Asaas é uma
        instituição de pagamento autorizada pelo Banco Central do Brasil.
      </p>
    </div>
  );
}

// ─── Sub-componente: suporte ─────────────────────────────────────────────────

function SupportLink() {
  const msg = encodeURIComponent(
    'Olá! Preciso de ajuda com meu pedido de upgrade.',
  );
  return (
    <a
      href={`https://wa.me/${WHATSAPP_SUPPORT}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-[10px] text-petroleum/80 hover:text-petroleum transition-colors"
    >
      <MessageCircle size={11} />
      Precisa de ajuda? Fale conosco
      <ChevronRight size={10} />
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANTE PIX
// ═══════════════════════════════════════════════════════════════════════════════

function StepDonePix({
  pixData,
  paymentUrl,
  planName,
  period,
  amount,
  upgradeRequestId,
  nextBillingDate,
  onPaymentConfirmedClose,
}: {
  pixData: { qrCode?: string; copyPaste?: string };
  paymentUrl?: string | null;
  planName: string;
  period: string;
  amount?: number | null;
  upgradeRequestId?: string | null;
  /** Próxima fatura formatada (ex.: \"12 de março de 2026\"). */
  nextBillingDate?: string | null;
  /** Chamado ao fechar o modal de confirmação pós-pagamento (fecha sheet e atualiza sidebar). */
  onPaymentConfirmedClose?: () => void;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );
  const [secondsLeft, setSecondsLeft] = useState(PIX_EXPIRY_SECONDS);
  const [expired, setExpired] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const startedAt = useRef(Date.now());

  // Poll status da solicitação quando temos requestId (após webhook atualizar para approved)
  useEffect(() => {
    if (!upgradeRequestId || paymentConfirmed) return;
    const check = async () => {
      const res = await getUpgradeRequestStatus(upgradeRequestId);
      if (res.success && res.status === 'approved') {
        setPaymentConfirmed(true);
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [upgradeRequestId, paymentConfirmed]);

  // Abrir modal de confirmação de migração quando o pagamento for confirmado
  useEffect(() => {
    if (paymentConfirmed && !showSuccessModal) {
      setShowSuccessModal(true);
    }
  }, [paymentConfirmed, showSuccessModal]);

  // Timer que resiste a re-renders: usa a data de início fixada no mount
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      const left = Math.max(0, PIX_EXPIRY_SECONDS - elapsed);
      setSecondsLeft(left);
      if (left === 0) {
        setExpired(true);
      } else {
        setTimeout(tick, 1000);
      }
    };
    const t = setTimeout(tick, 1000);
    return () => clearTimeout(t);
  }, []);

  // Após confirmação, mantém tela por alguns segundos e fecha sheet + atualiza plano
  useEffect(() => {
    if (!paymentConfirmed || !onPaymentConfirmedClose) return;
    const t = setTimeout(() => {
      onPaymentConfirmedClose();
    }, 10_000);
    return () => clearTimeout(t);
  }, [paymentConfirmed, onPaymentConfirmedClose]);

  const copyCode = useCallback(async () => {
    const text = pixData.copyPaste || paymentUrl || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2500);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2500);
    }
  }, [pixData.copyPaste, paymentUrl]);

  const urgencyColor =
    secondsLeft <= 60
      ? 'text-red-500'
      : secondsLeft <= 120
        ? 'text-amber-500'
        : 'text-petroleum/80';

  // Pagamento confirmado (webhook atualizou; polling detectou)
  if (paymentConfirmed) {
    return (
      <>
        <div className="flex flex-col items-center gap-4 px-4 py-2 w-full">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
              <Check size={28} className="text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide">
                Pagamento confirmado!
              </p>
              <p className="text-[11px] text-petroleum/80 mt-0.5">
                Seu plano foi ativado. Obrigado!
              </p>
            </div>
          </div>
          <OrderSummary planName={planName} period={period} amount={amount} />
          {nextBillingDate && (
            <div className="mt-1 w-full max-w-md p-2 rounded bg-slate-50 border border-slate-100 flex items-start gap-2 text-petroleum/80">
              <CalendarCheck size={12} className="mt-0.5 shrink-0" />
              <p className="text-[11px] leading-tight font-medium">
                Próxima fatura em <strong>{nextBillingDate}</strong>. Pagamento
                recorrente pelo mesmo método escolhido.
              </p>
            </div>
          )}
          <SecurityBadge />
          <SupportLink />
        </div>

        <BaseModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            onPaymentConfirmedClose?.();
          }}
          title="Migração de plano confirmada"
          subtitle="Pagamento recebido"
          headerIcon={<Check size={22} className="text-emerald-400" />}
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onPaymentConfirmedClose?.();
                }}
                className="btn-luxury-primary"
              >
                Fechar
              </button>
            </div>
          }
        >
          <p className="text-[13px] text-petroleum/90">
            Seu pagamento foi confirmado e o plano <strong>{planName}</strong>{' '}
            está ativo. Se o nome do plano na barra lateral não estiver
            atualizado, atualize a página usando o botão de F5 ou recarregue a
            página.
          </p>
        </BaseModal>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-3 w-full">
      {/* Ícone + título */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
          <QrCode size={26} className="text-gold" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide">
            Pague com PIX
          </p>
          <p className="text-[11px] text-petroleum/80 mt-0.5">
            Abra o app do seu banco e escaneie o código
          </p>
        </div>
      </div>

      {/* Resumo do pedido */}
      <OrderSummary planName={planName} period={period} amount={amount} />

      {/* QR Code */}
      {pixData.qrCode ? (
        <div className="flex flex-col items-center gap-3 w-full">
          {/* QR + timer */}
          <div className="relative">
            <div
              className={`rounded-xl border-2 bg-white p-3 transition-all ${
                expired
                  ? 'opacity-30 blur-sm border-red-200'
                  : 'border-petroleum/10'
              }`}
            >
              <img
                src={`data:image/png;base64,${pixData.qrCode}`}
                alt="QR Code PIX para pagamento"
                className="w-[172px] h-[172px] object-contain"
                aria-describedby="pix-timer-label"
              />
            </div>

            {expired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <AlertCircle size={28} className="text-red-500" />
                <p className="text-[11px] font-bold text-red-600 text-center px-4">
                  Código expirado
                </p>
              </div>
            )}
          </div>

          {/* Timer */}
          {!expired ? (
            <div
              id="pix-timer-label"
              className={`flex items-center gap-1.5 ${urgencyColor} transition-colors`}
              role="timer"
              aria-live="polite"
              aria-label={`Código válido por ${formatTimer(secondsLeft)}`}
            >
              <Clock size={11} />
              <span className="text-[10px] font-bold tabular-nums">
                Válido por {formatTimer(secondsLeft)}
              </span>
              {secondsLeft <= 60 && (
                <span className="text-[10px] font-bold animate-pulse">
                  · Quase expirando!
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-red-200 bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-100 transition-colors"
            >
              <RefreshCw size={12} />
              Gerar novo código
            </button>
          )}

          {/* Botão copiar */}
          {!expired && (
            <button
              type="button"
              onClick={copyCode}
              disabled={copyState !== 'idle'}
              className={`flex items-center justify-center gap-2 w-full max-w-[240px] py-2.5 rounded-xl border-2 font-bold text-[11px] uppercase tracking-wide transition-all ${
                copyState === 'copied'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : copyState === 'error'
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : 'border-champagne bg-champagne/10 text-petroleum hover:bg-champagne/25'
              }`}
            >
              {copyState === 'copied' ? (
                <>
                  <Check size={13} /> Copiado!
                </>
              ) : copyState === 'error' ? (
                <>
                  <AlertCircle size={13} /> Erro ao copiar
                </>
              ) : (
                <>
                  <Copy size={13} /> Copiar código PIX
                </>
              )}
            </button>
          )}

          {/* Instruções passo a passo */}
          <div className="w-full bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-petroleum/70 mb-1">
              Como pagar
            </p>
            {[
              'Abra o app do seu banco ou carteira digital',
              'Acesse a área PIX e escolha "Pagar com QR Code" ou "Copia e Cola"',
              'Escaneie o código ou cole o código copiado',
              'Confirme o pagamento — a ativação é automática',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-petroleum/10 text-petroleum text-[8px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[11px] text-petroleum/90 font-medium leading-snug">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : paymentUrl ? (
        /* Fallback: só o botão copiar sem QR */
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center justify-center gap-2 w-full max-w-[240px] py-2.5 rounded-xl border-2 border-champagne bg-champagne/10 text-petroleum font-bold text-[11px] uppercase tracking-wide hover:bg-champagne/25 transition-colors"
        >
          {copyState === 'copied' ? (
            <>
              <Check size={13} /> Copiado!
            </>
          ) : (
            <>
              <Copy size={13} /> Copiar código PIX
            </>
          )}
        </button>
      ) : null}

      <SecurityBadge />
      <SupportLink />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANTE CARTÃO DE CRÉDITO
// ═══════════════════════════════════════════════════════════════════════════════

function StepDoneCreditCard({
  paymentUrl,
  planName,
  period,
  amount,
  upgradeRequestId,
  nextBillingDate,
  onPaymentConfirmedClose,
}: {
  paymentUrl?: string | null;
  planName: string;
  period: string;
  amount?: number | null;
  upgradeRequestId?: string | null;
  nextBillingDate?: string | null;
  onPaymentConfirmedClose?: () => void;
}) {
  const [paymentConfirmed, setPaymentConfirmed] =
    useState<boolean>(false);

  // Poll do status da solicitação (mesma lógica do PIX)
  useEffect(() => {
    if (!upgradeRequestId || paymentConfirmed) return;
    const check = async () => {
      const res = await getUpgradeRequestStatus(upgradeRequestId);
      if (res.success && res.status === 'approved') {
        setPaymentConfirmed(true);
      }
    };
    check();
    const interval = setInterval(check, 5_000);
    return () => clearInterval(interval);
  }, [upgradeRequestId, paymentConfirmed]);

  // Após confirmação, aguarda alguns segundos e fecha sheet + atualiza plano
  useEffect(() => {
    if (!paymentConfirmed || !onPaymentConfirmedClose) return;
    const t = setTimeout(() => {
      onPaymentConfirmedClose();
    }, 10_000);
    return () => clearTimeout(t);
  }, [paymentConfirmed, onPaymentConfirmedClose]);

  if (paymentConfirmed) {
    return (
      <div className="flex flex-col items-center gap-5 px-4 py-6 w-full">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <Check size={26} className="text-emerald-500" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide">
              Pagamento confirmado!
            </p>
            <p className="text-[11px] text-petroleum/80 mt-0.5">
              Seu plano foi ativado imediatamente. Obrigado!
            </p>
          </div>
        </div>

        <OrderSummary planName={planName} period={period} amount={amount} />

        {nextBillingDate && (
          <div className="mt-1 w-full max-w-md p-2 rounded bg-slate-50 border border-slate-100 flex items-start gap-2 text-petroleum/80">
            <CreditCard size={12} className="mt-0.5 shrink-0" />
            <p className="text-[11px] leading-tight font-medium">
              Próxima fatura em <strong>{nextBillingDate}</strong>. Cobrança
              automática no cartão salvo.
            </p>
          </div>
        )}

        <SecurityBadge />
        <SupportLink />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 w-full">
      {/* Ícone + título */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <Check size={26} className="text-emerald-500" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide">
            Pagamento processado
          </p>
          <p className="text-[11px] text-petroleum/80 mt-0.5">
            Seu cartão foi submetido com sucesso
          </p>
        </div>
      </div>

      {/* Resumo */}
      <OrderSummary planName={planName} period={period} amount={amount} />

      {/* Status de ativação */}
      <div className="w-full bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Clock size={13} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-amber-800">
            Aguardando confirmação da operadora
          </p>
          <p className="text-[10px] text-amber-700/80 mt-0.5 leading-snug">
            A aprovação costuma ser imediata. Você receberá um e-mail assim que
            o plano for ativado. Em caso de recusa, nenhum valor é debitado.
          </p>
        </div>
      </div>

      {/* Próximos passos */}
      <div className="w-full space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-petroleum/80">
          O que acontece agora
        </p>
        <NextStep
          icon={Check}
          text="A operadora do cartão processa a autorização em tempo real"
        />
        <NextStep
          icon={Sparkles}
          text={`Plano ${planName} ativado automaticamente após aprovação`}
        />
        <NextStep
          icon={CalendarCheck}
          text="Você receberá um e-mail de confirmação com o comprovante"
        />
      </div>

      {paymentUrl && (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-petroleum/20 bg-white text-petroleum font-bold text-[11px] uppercase tracking-wide hover:bg-petroleum/5 transition-colors"
        >
          <CreditCard size={13} />
          Ver status / comprovante
          <ChevronRight size={12} />
        </a>
      )}

      <SecurityBadge />
      <SupportLink />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANTE BOLETO
// ═══════════════════════════════════════════════════════════════════════════════

function StepDoneBoleto({
  paymentUrl,
  paymentDueDate,
  planName,
  period,
  amount,
}: {
  paymentUrl?: string | null;
  /** Data de vencimento YYYY-MM-DD vinda do Asaas; quando presente, usada em vez do cálculo local. */
  paymentDueDate?: string | null;
  planName: string;
  period: string;
  amount?: number | null;
}) {
  const vencimento =
    paymentDueDate && /^\d{4}-\d{2}-\d{2}/.test(paymentDueDate)
      ? formatDatePtBr(paymentDueDate)
      : getBoletoVencimento(3);

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 w-full">
      {/* Ícone + título */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
          <Banknote size={26} className="text-gold" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide">
            Boleto gerado
          </p>
          <p className="text-[11px] text-petroleum/80 mt-0.5">
            Pague em qualquer banco, lotérica ou app
          </p>
        </div>
      </div>

      {/* Resumo */}
      <OrderSummary planName={planName} period={period} amount={amount} />

      {/* Aviso de vencimento */}
      <div className="w-full bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-amber-800">
            Vencimento do plano em {vencimento}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-snug font-medium">
            O plano é ativado após a compensação bancária, que pode levar até 1
            dia útil após o pagamento.
          </p>
        </div>
      </div>

      {/* Próximos passos */}
      <div className="w-full space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-petroleum/80">
          O que acontece agora
        </p>
        <NextStep
          icon={FileText}
          text="Baixe o boleto e pague até a data de vencimento"
        />
        <NextStep
          icon={CalendarCheck}
          text="Após compensação (até 1 dia útil), o plano é ativado automaticamente"
        />
        <NextStep
          icon={Sparkles}
          text={`Plano ${planName} liberado sem nenhuma ação adicional`}
        />
      </div>

      {paymentUrl && (
        <div className="w-full space-y-2">
          <p className="text-[10px] text-petroleum/90 text-center leading-snug">
            O download do PDF será iniciado. Caso não ocorra, clique no botão
            abaixo.
          </p>
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxury-primary max-w-max-[80px] flex items-center justify-center gap-2"
          >
            <FileText size={13} />
            Baixar boleto
          </a>
        </div>
      )}

      <SecurityBadge />
      <SupportLink />
    </div>
  );
}

// ─── Variante: upgrade gratuito (sem pagamento) ──────────────────────────────

function StepDoneFreeUpgrade({
  planName,
  nextBillingDate,
}: {
  planName: string;
  nextBillingDate: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 w-full">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <Check size={26} className="text-emerald-500" strokeWidth={2.5} />
        </div>
        <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide text-center">
          Upgrade concluído
        </p>
        <p className="text-[12px] text-petroleum/80 mt-0.5 text-center">
          Seu crédito cobriu o plano. O plano <strong>{planName}</strong> está
          ativo.{' '}
          {nextBillingDate ? (
            <>
              A próxima cobrança será em{' '}
              <strong className="text-petroleum">{nextBillingDate}</strong>.
            </>
          ) : (
            'Nenhum valor foi cobrado.'
          )}
        </p>
      </div>
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[12px] text-slate-600">
        Nenhum pagamento foi processado. Você continua com acesso até a data de
        vencimento calculada pelo seu saldo.
      </div>
      <SupportLink />
    </div>
  );
}

// ─── Variante: downgrade agendado ────────────────────────────────────────────

function StepDoneDowngrade({
  planName,
  effectiveAt,
  handleClose,
}: {
  planName: string;
  effectiveAt: string;
  handleClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 w-full">
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
          <CalendarCheck size={26} className="text-gold" />
        </div>
        <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide text-center">
          Mudança de plano agendada
        </p>
        <p className="text-[12px] text-petroleum/80 mt-0.5 text-center">
          Sua mudança para o plano <strong>{planName}</strong> será efetivada em{' '}
          <strong className="text-petroleum">
            {formatDateLong(effectiveAt)}
          </strong>
          .
        </p>
      </div>
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[12px] text-slate-600 ">
        Até lá você continua com os benefícios do plano atual. Nenhuma cobrança
        adicional foi gerada.
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="btn-luxury-primary"
      >
        Fechar
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function StepDone() {
  const router = useRouter();
  const {
    paymentUrl,
    paymentDueDate,
    pixData,
    downgradeEffectiveAt,
    selectedPlanInfo,
    selectedPlan,
    billingType,
    billingPeriod,
    handleClose,
    upgradeRequestId,
    upgradeCalculation,
    requestWarning,
  } = useUpgradeSheetContext();

  const planName = selectedPlanInfo?.name ?? selectedPlan;

  const isFreeUpgrade = upgradeCalculation?.is_free_upgrade === true;

  // Usa o valor efetivamente cobrado (amount_final da API), não o preço mensal base.
  // Para upgrade gratuito: 0. Para pagamento com crédito/PIX: o valor já descontado.
  // Fallback para selectedPlanInfo.price apenas quando não há cálculo disponível.
  const amount: number | undefined = isFreeUpgrade
    ? 0
    : typeof upgradeCalculation?.amount_final === 'number' &&
        Number.isFinite(upgradeCalculation.amount_final) &&
        upgradeCalculation.amount_final > 0
      ? upgradeCalculation.amount_final
      : selectedPlanInfo?.price;

  const nextBillingDateFormatted = upgradeCalculation?.new_expiry_date
    ? formatDateLong(upgradeCalculation.new_expiry_date)
    : null;

  const handlePaymentConfirmedClose = () => {
    handleClose();
    router.refresh();
  };

  const handleCloseAndRefresh = () => {
    handleClose();
    router.refresh();
  };

  if (downgradeEffectiveAt) {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto">
        <StepDoneDowngrade
          planName={planName}
          effectiveAt={downgradeEffectiveAt}
          handleClose={handleCloseAndRefresh}
        />
      </div>
    );
  }

  if (isFreeUpgrade) {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto">
        <StepDoneFreeUpgrade
          planName={planName}
          nextBillingDate={nextBillingDateFormatted}
        />
        <div className="flex justify-center pb-6">
          <button
            type="button"
            onClick={handleCloseAndRefresh}
            className="btn-luxury-primary"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full overflow-y-auto">
      {requestWarning && (
        <div className="mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
          <p className="font-medium">{requestWarning}</p>
        </div>
      )}
      {/* Conteúdo por billing_type */}
      {billingType === 'PIX' ? (
        <StepDonePix
          pixData={pixData ?? {}}
          paymentUrl={paymentUrl}
          planName={planName}
          period={billingPeriod ?? 'monthly'}
          amount={amount}
          upgradeRequestId={upgradeRequestId}
          nextBillingDate={nextBillingDateFormatted}
          onPaymentConfirmedClose={handlePaymentConfirmedClose}
        />
      ) : billingType === 'BOLETO' ? (
        <StepDoneBoleto
          paymentUrl={paymentUrl}
          paymentDueDate={paymentDueDate}
          planName={planName}
          period={billingPeriod ?? 'monthly'}
          amount={amount}
        />
      ) : (
        <StepDoneCreditCard
          paymentUrl={paymentUrl}
          planName={planName}
          period={billingPeriod ?? 'monthly'}
          amount={amount}
          upgradeRequestId={upgradeRequestId}
          nextBillingDate={nextBillingDateFormatted}
          onPaymentConfirmedClose={handlePaymentConfirmedClose}
        />
      )}

      {/* Fechar */}
      <div className="flex justify-center pb-6">
        <button
          type="button"
          onClick={handleCloseAndRefresh}
          className="btn-luxury-primary"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
