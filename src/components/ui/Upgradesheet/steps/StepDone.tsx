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

// ─── Constantes ───────────────────────────────────────────────────────────────

const PIX_EXPIRY_SECONDS = 5 * 60; // 5 minutos (Asaas padrão)
const WHATSAPP_SUPPORT = '5511999999999'; // substituir pelo número real

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimer(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatBRL(value?: number | null) {
  if (!value) return '';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getBoletoVencimento(days = 3) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('pt-BR');
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
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
        <p className="text-[10px] font-bold uppercase tracking-wider text-petroleum/40">
          Contratado
        </p>
        <p className="text-[13px] font-bold text-petroleum truncate">
          Plano {planName} · {periodLabel[period] ?? period}
        </p>
      </div>
      {amount && (
        <p className="text-[15px] font-black text-petroleum shrink-0">
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
      <div className="w-5 h-5 rounded-full bg-gold/15 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={10} className="text-gold" />
      </div>
      <p className="text-[11px] text-petroleum/80 leading-snug">{text}</p>
    </div>
  );
}

// ─── Sub-componente: selo de segurança ───────────────────────────────────────

function SecurityBadge() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-petroleum/60">
      <ShieldCheck size={11} />
      <span className="text-[9px] font-semibold uppercase tracking-wider">
        Pagamento seguro · Processado pela Asaas
      </span>
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
      className="flex items-center gap-1.5 text-[10px] text-petroleum/60 hover:text-petroleum/70 transition-colors"
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
}: {
  pixData: { qrCode?: string; copyPaste?: string };
  paymentUrl?: string | null;
  planName: string;
  period: string;
  amount?: number | null;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );
  const [secondsLeft, setSecondsLeft] = useState(PIX_EXPIRY_SECONDS);
  const [expired, setExpired] = useState(false);
  const startedAt = useRef(Date.now());

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
        : 'text-petroleum/50';

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-3 w-full">
      {/* Ícone + título */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
          <QrCode size={26} className="text-gold" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-black text-petroleum uppercase tracking-wide">
            Pague com PIX
          </p>
          <p className="text-[11px] text-petroleum/50 mt-0.5">
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-petroleum/40 mb-1">
              Como pagar
            </p>
            {[
              'Abra o app do seu banco ou carteira digital',
              'Acesse a área PIX e escolha "Pagar com QR Code" ou "Copia e Cola"',
              'Escaneie o código ou cole o código copiado',
              'Confirme o pagamento — a ativação é automática',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-petroleum/10 text-petroleum text-[8px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[11px] text-petroleum/60 leading-snug">
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
}: {
  paymentUrl?: string | null;
  planName: string;
  period: string;
  amount?: number | null;
}) {
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
  planName,
  period,
  amount,
}: {
  paymentUrl?: string | null;
  planName: string;
  period: string;
  amount?: number | null;
}) {
  const vencimento = getBoletoVencimento(3);

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 w-full">
      {/* Ícone + título */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
          <Banknote size={26} className="text-gold" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-black text-petroleum uppercase tracking-wide">
            Boleto gerado
          </p>
          <p className="text-[11px] text-petroleum/50 mt-0.5">
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
            Vencimento em {vencimento}
          </p>
          <p className="text-[10px] text-amber-700/80 mt-0.5 leading-snug">
            O plano é ativado após a compensação bancária, que pode levar até 1
            dia útil após o pagamento.
          </p>
        </div>
      </div>

      {/* Próximos passos */}
      <div className="w-full space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-petroleum/40">
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
        <a
          href={paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-luxury-primary w-full flex items-center justify-center gap-2"
        >
          <FileText size={13} />
          Baixar boleto
        </a>
      )}

      <SecurityBadge />
      <SupportLink />
    </div>
  );
}

// ─── Variante: downgrade agendado (sem pagamento) ───────────────────────────

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
        <p className="text-[15px] font-black text-petroleum uppercase tracking-wide text-center">
          Mudança de plano agendada
        </p>
        <p className="text-[11px] text-petroleum/50 mt-0.5 text-center">
          Sua mudança para o plano <strong>{planName}</strong> será efetivada em{' '}
          <strong className="text-petroleum">
            {formatDateLong(effectiveAt)}
          </strong>
          .
        </p>
      </div>
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] text-slate-600">
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
  const {
    paymentUrl,
    pixData,
    downgradeEffectiveAt,
    selectedPlanInfo,
    selectedPlan,
    billingType,
    billingPeriod,
    handleClose,
  } = useUpgradeSheetContext();

  const planName = selectedPlanInfo?.name ?? selectedPlan;
  const amount = selectedPlanInfo?.price;

  if (downgradeEffectiveAt) {
    return (
      <div className="flex flex-col min-h-full overflow-y-auto">
        <StepDoneDowngrade
          planName={planName}
          effectiveAt={downgradeEffectiveAt}
          handleClose={handleClose}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full overflow-y-auto">
      {/* Conteúdo por billing_type */}
      {billingType === 'PIX' ? (
        <StepDonePix
          pixData={pixData ?? {}}
          paymentUrl={paymentUrl}
          planName={planName}
          period={billingPeriod ?? 'monthly'}
          amount={amount}
        />
      ) : billingType === 'BOLETO' ? (
        <StepDoneBoleto
          paymentUrl={paymentUrl}
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
        />
      )}

      {/* Fechar */}
      <div className="flex justify-center pb-6">
        <button
          type="button"
          onClick={handleClose}
          className="btn-luxury-primary"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
