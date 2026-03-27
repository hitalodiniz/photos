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
import { isUpgradeRequestPaymentComplete } from '@/core/types/billing';
import { useRouter } from 'next/navigation';
import { formatBRL, formatDatePtBr, formatDateLong } from '../utils';
import { SheetFooter } from '@/components/ui/Sheet';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PIX_EXPIRY_SECONDS = 5 * 60;
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

// ─── Sub-componentes utilitários ─────────────────────────────────────────────

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
    <div className="relative px-3.5 py-1.5 rounded-luxury border border-slate-100 bg-white shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70 mb-1">
        Contratado
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-bold text-petroleum truncate">
          Plano {planName} · {periodLabel[period] ?? period}
        </p>
        {amount != null && amount > 0 && (
          <p className="text-[15px] font-bold text-petroleum shrink-0">
            {formatBRL(amount)}
          </p>
        )}
      </div>
    </div>
  );
}

function NextStep({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={12} className="text-gold" />
      </div>
      <p className="text-[11px] font-medium text-petroleum/90 leading-snug">
        {text}
      </p>
    </div>
  );
}

function SecurityBadge() {
  return (
    <div className="flex flex-col items-center gap-1 pt-2">
      <div className="flex items-center justify-center gap-1.5 text-petroleum/60">
        <ShieldCheck size={11} className="text-emerald-600" />
        <span className="text-[9px] font-bold uppercase tracking-wider">
          Pagamento seguro · Processado pela Asaas
        </span>
      </div>
      <p className="text-[9px] text-petroleum/90 max-w-[350px] text-center leading-tight">
        Seus dados são protegidos por criptografia SSL. O Asaas é uma
        instituição de pagamento autorizada pelo Banco Central do Brasil.
      </p>
    </div>
  );
}

function SupportLink() {
  const msg = encodeURIComponent(
    'Olá! Preciso de ajuda com meu pedido de upgrade.',
  );
  return (
    <a
      href={`https://wa.me/${WHATSAPP_SUPPORT}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-1.5 text-[10px] text-petroleum/80 hover:text-petroleum transition-colors"
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
  nextBillingDate?: string | null;
  onPaymentConfirmedClose?: () => void;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );
  const [secondsLeft, setSecondsLeft] = useState(PIX_EXPIRY_SECONDS);
  const [expired, setExpired] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!upgradeRequestId || paymentConfirmed) return;
    const check = async () => {
      const res = await getUpgradeRequestStatus(upgradeRequestId);
      if (res.success && isUpgradeRequestPaymentComplete(res.status))
        setPaymentConfirmed(true);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [upgradeRequestId, paymentConfirmed]);

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      const left = Math.max(0, PIX_EXPIRY_SECONDS - elapsed);
      setSecondsLeft(left);
      if (left === 0) setExpired(true);
      else setTimeout(tick, 1000);
    };
    const t = setTimeout(tick, 1000);
    return () => clearTimeout(t);
  }, []);

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

  if (paymentConfirmed) {
    return (
      <div className="space-y-4 px-4 py-3">
        {/* Header de Sucesso */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <Check size={26} className="text-emerald-600" strokeWidth={2.5} />
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

        {/* Order Summary */}
        <OrderSummary planName={planName} period={period} amount={amount} />

        {/* Próxima Fatura */}
        {nextBillingDate && (
          <div className="p-2 rounded-luxury bg-slate-50 border border-slate-100 flex items-start gap-2 text-petroleum/80">
            <CalendarCheck size={12} className="mt-0.5 shrink-0" />
            <p className="text-[11px] leading-tight font-medium">
              Próxima fatura em <strong>{nextBillingDate}</strong>. Pagamento
              recorrente pelo mesmo método.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-luxury border border-emerald-200 bg-emerald-50/60 px-3 py-2">
          <p className="text-[11px] text-petroleum/90 leading-snug">
            Seu pagamento foi confirmado e o plano <strong>{planName}</strong>{' '}
            está ativo. Se o nome do plano na barra lateral não estiver
            atualizado, recarregue a página (F5).
          </p>
        </div>

        {/* Security + Support */}
        <SecurityBadge />
        <SupportLink />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-3">
      {/* Header */}
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

      {/* Order Summary */}
      <OrderSummary planName={planName} period={period} amount={amount} />

      {/* QR Code Section */}
      {pixData.qrCode && (
        <div className="flex flex-col items-center gap-3">
          {/* QR Code Image */}
          <div className="relative">
            <div
              className={`rounded-xl border-2 bg-white p-3 transition-all ${expired ? 'opacity-30 blur-sm border-red-200' : 'border-petroleum/10'}`}
            >
              <img
                src={`data:image/png;base64,${pixData.qrCode}`}
                alt="QR Code PIX para pagamento"
                className="w-[172px] h-[172px] object-contain"
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
              className={`flex items-center gap-1.5 ${urgencyColor} transition-colors`}
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
              <RefreshCw size={12} /> Gerar novo código
            </button>
          )}

          {/* Copy Button */}
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

          {/* Instructions */}
          <div className="rounded-luxury border border-slate-100 bg-slate-50 px-3.5 py-1.5 space-y-2 w-full">
            <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70 mb-1">
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
      )}

      {/* Copy Button (se não tiver QR Code) */}
      {!pixData.qrCode && paymentUrl && (
        <div className="w-full space-y-2">
          <div className="rounded-luxury border border-amber-200 bg-amber-50 px-3 py-2 ">
            <p className="text-[11px] text-amber-900 leading-snug font-medium">
              Nao foi possivel gerar o QR Code agora. Voce pode concluir o
              pagamento abrindo a cobranca direto no Asaas.
            </p>
          </div>

          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxury-primary flex items-center justify-center gap-2 w-full"
          >
            <QrCode size={13} /> Abrir cobranca no Asaas
          </a>

          <button
            type="button"
            onClick={copyCode}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 font-bold text-[11px] uppercase tracking-wide transition-all ${
              copyState === 'copied'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-champagne bg-champagne/10 text-petroleum hover:bg-champagne/25'
            }`}
          >
            {copyState === 'copied' ? (
              <>
                <Check size={13} /> Copiado!
              </>
            ) : (
              <>
                <Copy size={13} /> Copiar link da cobranca
              </>
            )}
          </button>
        </div>
      )}

      {/* Security + Support */}
      <SecurityBadge />
      <SupportLink />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANTE CARTÃO
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
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (!upgradeRequestId || paymentConfirmed) return;
    const check = async () => {
      const res = await getUpgradeRequestStatus(upgradeRequestId);
      if (res.success && isUpgradeRequestPaymentComplete(res.status))
        setPaymentConfirmed(true);
    };
    check();
    const interval = setInterval(check, 5_000);
    return () => clearInterval(interval);
  }, [upgradeRequestId, paymentConfirmed]);

  useEffect(() => {
    if (!paymentConfirmed || !onPaymentConfirmedClose) return;
    const t = setTimeout(() => onPaymentConfirmedClose(), 10_000);
    return () => clearTimeout(t);
  }, [paymentConfirmed, onPaymentConfirmedClose]);

  if (paymentConfirmed) {
    return (
      <div className="space-y-4 px-4 py-3">
        {/* Header de Sucesso */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <Check size={26} className="text-emerald-600" strokeWidth={2.5} />
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

        {/* Order Summary */}
        <OrderSummary planName={planName} period={period} amount={amount} />

        {/* Próxima Fatura */}
        {nextBillingDate && (
          <div className="p-2 rounded-luxury bg-slate-50 border border-slate-100 flex items-start gap-2 text-petroleum/80">
            <CreditCard size={12} className="mt-0.5 shrink-0" />
            <p className="text-[11px] leading-tight font-medium">
              Próxima fatura em <strong>{nextBillingDate}</strong>. Cobrança
              automática no cartão salvo.
            </p>
          </div>
        )}

        {/* Security + Support */}
        <SecurityBadge />
        <SupportLink />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-3">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <Check size={26} className="text-emerald-600" strokeWidth={2.5} />
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

      {/* Order Summary */}
      <OrderSummary planName={planName} period={period} amount={amount} />

      {/* Aguardando Confirmação */}
      <div className="rounded-luxury bg-amber-50 border border-amber-200/60 px-3 py-2 flex items-start gap-2">
        <Clock size={13} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-amber-800">
            Aguardando confirmação da operadora
          </p>
          <p className="text-[10px] text-amber-700/80 mt-0.5 leading-snug">
            A aprovação costuma ser imediata. Você receberá um e-mail assim que
            o plano for ativado.
          </p>
        </div>
      </div>

      {/* Próximos Passos */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70">
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

      {/* Ver Status */}
      {paymentUrl && (
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-petroleum/20 bg-white text-petroleum font-bold text-[11px] uppercase tracking-wide hover:bg-petroleum/5 transition-colors"
        >
          <CreditCard size={13} /> Ver status / comprovante{' '}
          <ChevronRight size={12} />
        </a>
      )}

      {/* Security + Support */}
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
    <div className="space-y-4 px-4 py-3">
      {/* Header */}
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

      {/* Order Summary */}
      <OrderSummary planName={planName} period={period} amount={amount} />

      {/* Vencimento */}
      <div className="rounded-luxury bg-amber-50 border border-amber-200/60 px-3 py-2 flex items-start gap-2">
        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-amber-800">
            Vencimento do plano em {vencimento}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-snug font-medium">
            O plano é ativado após a compensação bancária (até 1 dia útil após o
            pagamento).
          </p>
        </div>
      </div>

      {/* Próximos Passos */}
      <div className="space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70">
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

      {/* Security + Support */}
      <SecurityBadge />
      <SupportLink />
    </div>
  );
}

// ─── Variante: upgrade gratuito ──────────────────────────────────────────────

function StepDoneFreeUpgrade({
  planName,
  nextBillingDate,
}: {
  planName: string;
  nextBillingDate: string | null;
}) {
  return (
    <div className="space-y-4 px-4 py-3">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <Check size={26} className="text-emerald-600" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide">
            Upgrade concluído
          </p>
          <p className="text-[11px] text-petroleum/80 mt-0.5 leading-snug max-w-md">
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
      </div>

      {/* Info */}
      <div className="rounded-luxury border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] text-slate-600 leading-snug">
          Nenhum pagamento foi processado. Você continua com acesso até a data
          de vencimento calculada pelo seu saldo.
        </p>
      </div>

      {/* Support */}
      <SupportLink />
    </div>
  );
}

// ─── Variante: downgrade agendado (fora da janela de arrependimento) ──────────

function StepDoneScheduledChange({
  planName,
  effectiveAt,
  handleClose,
}: {
  planName: string;
  effectiveAt: string;
  handleClose: () => void;
}) {
  return (
    <div className="space-y-4 px-4 py-3">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
          <CalendarCheck size={26} className="text-gold" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide">
            Downgrade agendado
          </p>
          <p className="text-[11px] text-petroleum/80 mt-0.5 leading-snug max-w-md">
            A mudança para o plano <strong>{planName}</strong> ocorrerá em{' '}
            <strong className="text-petroleum">
              {formatDateLong(effectiveAt)}
            </strong>
            .
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-luxury border border-slate-200 bg-slate-50 px-3 py-2 space-y-2">
        <p className="text-[11px] text-slate-600 leading-snug">
          Até essa data, você mantém todos os benefícios do plano atual.
        </p>
        <p className="text-[11px] text-slate-600 leading-snug">
          Não estamos aguardando aprovação da operadora agora. A nova assinatura
          será iniciada automaticamente na data indicada.
        </p>
        <p className="text-[11px] text-slate-600 leading-snug">
          A recorrência do novo plano começará nesse dia, conforme a forma de
          pagamento escolhida.
        </p>
        <p className="text-[11px] text-slate-600 leading-snug">
          Se desejar, você pode cancelar esta intenção antes da data de
          efetivação na tela de assinatura.
        </p>
      </div>

      {/* Support */}
      <SupportLink />
    </div>
  );
}

// ─── Variante: downgrade imediato com crédito (janela arrependimento) ─────────

function StepDoneImmediateDowngrade({
  planName,
  nextBillingDate,
  handleClose,
}: {
  planName: string;
  nextBillingDate: string | null;
  handleClose: () => void;
}) {
  return (
    <div className="space-y-4 px-4 py-3">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <Check size={26} className="text-emerald-600" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide">
            Plano alterado
          </p>
          <p className="text-[11px] text-petroleum/80 mt-0.5 leading-snug max-w-md">
            Seu plano foi alterado para <strong>{planName}</strong>{' '}
            imediatamente.
            {nextBillingDate && (
              <>
                {' '}
                Acesso garantido até{' '}
                <strong className="text-petroleum">
                  {nextBillingDate}
                </strong>{' '}
                pelo crédito aplicado.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-luxury border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] text-slate-600 leading-snug">
          O crédito dos dias não utilizados do plano anterior foi convertido em
          saldo e aplicado ao novo plano.
        </p>
      </div>

      {/* Support */}
      <SupportLink />
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

  const isScheduledChange =
    upgradeCalculation?.type === 'downgrade' &&
    upgradeCalculation.is_downgrade_withdrawal_window === false &&
    !!downgradeEffectiveAt;

  const isImmediateDowngrade =
    upgradeCalculation?.type === 'downgrade' &&
    upgradeCalculation.is_downgrade_withdrawal_window === true;

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

  const handleCloseAndRefresh = () => {
    handleClose();
    router.refresh();
  };

  const [footerCopyState, setFooterCopyState] = useState<
    'idle' | 'copied' | 'error'
  >('idle');
  const isPix = billingType === 'PIX';
  const pixCopyText = pixData?.copyPaste || paymentUrl || '';
  const hasPixCopyAction = isPix && !!pixCopyText;
  const pixCopyLabel = pixData?.copyPaste
    ? 'Copiar código PIX'
    : 'Copiar link da cobrança';
  const isBoleto = billingType === 'BOLETO';
  const hasBoletoDownload = isBoleto && !!paymentUrl;

  const handleFooterCopyPix = async () => {
    if (!pixCopyText || footerCopyState !== 'idle') return;
    try {
      await navigator.clipboard.writeText(pixCopyText);
      setFooterCopyState('copied');
      setTimeout(() => setFooterCopyState('idle'), 2500);
    } catch {
      setFooterCopyState('error');
      setTimeout(() => setFooterCopyState('idle'), 2500);
    }
  };

  // ── 1. Downgrade agendado ──
  if (isScheduledChange) {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto">
        <StepDoneScheduledChange
          planName={planName}
          effectiveAt={downgradeEffectiveAt!}
          handleClose={handleCloseAndRefresh}
        />
        <SheetFooter className="bg-petroleum border-t border-petroleum/10">
          <button
            type="button"
            onClick={handleCloseAndRefresh}
            className="btn-secondary-white w-full"
          >
            Fechar
          </button>
        </SheetFooter>
      </div>
    );
  }

  // ── 2. Downgrade imediato com crédito ──
  if (isImmediateDowngrade && (upgradeCalculation?.amount_final ?? 0) === 0) {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto">
        <StepDoneImmediateDowngrade
          planName={planName}
          nextBillingDate={nextBillingDateFormatted}
          handleClose={handleCloseAndRefresh}
        />
        <SheetFooter className="bg-petroleum border-t border-petroleum/10">
          <button
            type="button"
            onClick={handleCloseAndRefresh}
            className="btn-secondary-white w-full"
          >
            Fechar
          </button>
        </SheetFooter>
      </div>
    );
  }

  // ── 3. Upgrade gratuito ──
  if (isFreeUpgrade) {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto">
        <StepDoneFreeUpgrade
          planName={planName}
          nextBillingDate={nextBillingDateFormatted}
        />
        <SheetFooter className="bg-petroleum border-t border-petroleum/10">
          <button
            type="button"
            onClick={handleCloseAndRefresh}
            className="btn-secondary-white w-full"
          >
            Fechar
          </button>
        </SheetFooter>
      </div>
    );
  }

  // ── 4. Pagamento normal ──
  const handlePaymentConfirmedClose = () => {
    handleClose();
    router.refresh();
  };

  return (
    <div className="flex flex-col min-h-full overflow-y-auto">
      {requestWarning && (
        <div className="mx-4 mt-2 rounded-luxury border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[11px] text-amber-900 font-medium">
            {requestWarning}
          </p>
        </div>
      )}

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

      <SheetFooter className="bg-petroleum border-t border-petroleum/10">
        <div className="flex w-full gap-2">
          {hasPixCopyAction && (
            <button
              type="button"
              onClick={handleFooterCopyPix}
              disabled={footerCopyState !== 'idle'}
              className={`flex-1 min-w-0 px-3 h-10 rounded-md border text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                footerCopyState === 'copied'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : footerCopyState === 'error'
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : 'border-champagne bg-champagne text-petroleum hover:bg-champagne/80'
              }`}
            >
              {footerCopyState === 'copied'
                ? 'Copiado!'
                : footerCopyState === 'error'
                  ? 'Erro ao copiar'
                  : pixCopyLabel}
            </button>
          )}
          {hasBoletoDownload && (
            <a
              href={paymentUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-luxury-primary flex-1 min-w-0 flex items-center justify-center gap-2"
            >
              <FileText size={13} />
              Baixar boleto
            </a>
          )}
          <button
            type="button"
            onClick={handleCloseAndRefresh}
            className="btn-secondary-white flex-1 min-w-0"
          >
            Fechar
          </button>
        </div>
      </SheetFooter>
    </div>
  );
}
