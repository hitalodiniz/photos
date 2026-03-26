'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CalendarCheck,
  ChevronRight,
  Check,
  Clock,
  Copy,
  CreditCard,
  FileText,
  MessageCircle,
  QrCode,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUpgradeRequestStatus } from '@/core/services/asaas.service';
import { formatBRL, formatDateLong, formatDatePtBr } from '@/components/ui/Upgradesheet/utils';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type StepDoneStatus = 'pending' | 'approved' | 'rejected' | 'overdue';
const WHATSAPP_SUPPORT = '5531993522018';

export interface StepDoneWrapperProps {
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  status: StepDoneStatus;
  paymentData: {
    pixData?: { qrCode?: string; copyPaste?: string };
    paymentUrl?: string | null;
    paymentDueDate?: string | null;
    amount?: number | null;
    errorMessage?: string | null;
  };
  planInfo: { name: string; period: string; nextBillingDate?: string | null };
  upgradeRequestId: string;
  onClose: () => void;
}

function mapPeriodLabel(period: string) {
  if (period === 'monthly') return 'Mensal';
  if (period === 'semiannual') return 'Semestral';
  if (period === 'annual') return 'Anual';
  return period;
}

function safeNextBillingDateLabel(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Se já vier em texto formatado (ex.: 26/04/2026), não tenta reformatar.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDateLong(trimmed);
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
        Seus dados sao protegidos por criptografia SSL.
      </p>
    </div>
  );
}

function SupportLink() {
  const msg = encodeURIComponent(
    'Ola! Preciso de ajuda com meu pagamento.',
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

function OrderSummary({
  name,
  period,
  amount,
}: {
  name: string;
  period: string;
  amount?: number | null;
}) {
  return (
    <div className="relative px-3.5 py-1.5 rounded-luxury border border-slate-100 bg-white shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70 mb-1">
        Resumo
      </p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <p className="text-[13px] font-bold text-petroleum">
          Plano {name} · {mapPeriodLabel(period)}
        </p>
        {typeof amount === 'number' && amount > 0 && (
          <p className="text-[14px] font-bold text-petroleum">{formatBRL(amount)}</p>
        )}
      </div>
    </div>
  );
}

export function StepDoneWrapper({
  billingType,
  status,
  paymentData,
  planInfo,
  upgradeRequestId,
  onClose,
}: StepDoneWrapperProps) {
  const router = useRouter();
  const [runtimeStatus, setRuntimeStatus] = useState<StepDoneStatus>(status);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [pixRuntimeData, setPixRuntimeData] = useState<{
    qrCode?: string;
    copyPaste?: string;
  } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixLoadError, setPixLoadError] = useState<string | null>(null);
  const [pixRetryCount, setPixRetryCount] = useState(0);

  useEffect(() => {
    setRuntimeStatus(status);
  }, [status]);

  useEffect(() => {
    if (!upgradeRequestId || runtimeStatus === 'approved') return;
    const interval = setInterval(async () => {
      const result = await getUpgradeRequestStatus(upgradeRequestId);
      if (result.success && result.status === 'approved') {
        setRuntimeStatus('approved');
        router.refresh();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [upgradeRequestId, runtimeStatus, router]);

  const loadPixData = useCallback(async () => {
    if (billingType !== 'PIX' || !upgradeRequestId) return;
    setPixLoadError(null);
    setPixLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/payment-pix?requestId=${encodeURIComponent(upgradeRequestId)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const apiError = String(body?.error ?? '').trim();
        setPixLoadError(
          apiError &&
            !/erro desconhecido/i.test(apiError) &&
            !/unknown error/i.test(apiError)
            ? apiError
            : 'Ainda estamos preparando o QR Code do PIX. Aguarde alguns segundos e tente novamente.',
        );
        return;
      }
      const json = (await res.json()) as {
        encodedImage?: string | null;
        payload?: string | null;
      };
      setPixRuntimeData({
        qrCode: json.encodedImage ?? undefined,
        copyPaste: json.payload ?? undefined,
      });
    } catch {
      setPixLoadError(
        'Ainda estamos preparando o QR Code do PIX. Aguarde alguns segundos e tente novamente.',
      );
    } finally {
      setPixLoading(false);
    }
  }, [billingType, upgradeRequestId]);

  useEffect(() => {
    if (billingType !== 'PIX' || !upgradeRequestId) return;
    const hasQrFromAction = Boolean(paymentData.pixData?.qrCode);
    const hasPayloadFromAction = Boolean(paymentData.pixData?.copyPaste);
    if (hasQrFromAction || hasPayloadFromAction) {
      setPixLoadError(null);
      setPixRuntimeData({
        qrCode: paymentData.pixData?.qrCode,
        copyPaste: paymentData.pixData?.copyPaste,
      });
      return;
    }
    loadPixData();
  }, [
    loadPixData,
    billingType,
    upgradeRequestId,
    paymentData.pixData?.qrCode,
    paymentData.pixData?.copyPaste,
  ]);

  // Auto-retry curto para reduzir erro logo após reciclar cobrança.
  useEffect(() => {
    if (billingType !== 'PIX' || !upgradeRequestId) return;
    if (!pixLoadError) return;
    if (pixRetryCount >= 3) return;
    const t = setTimeout(() => {
      setPixRetryCount((n) => n + 1);
      loadPixData();
    }, 1500);
    return () => clearTimeout(t);
  }, [
    billingType,
    upgradeRequestId,
    pixLoadError,
    pixRetryCount,
    loadPixData,
  ]);

  const dueDateText = useMemo(() => {
    if (!paymentData.paymentDueDate) return null;
    return /^\d{4}-\d{2}-\d{2}/.test(paymentData.paymentDueDate)
      ? formatDatePtBr(paymentData.paymentDueDate)
      : null;
  }, [paymentData.paymentDueDate]);
  const nextBillingDateText = useMemo(
    () => safeNextBillingDateLabel(planInfo.nextBillingDate),
    [planInfo.nextBillingDate],
  );

  const copyPix = useCallback(async () => {
    const content = (pixRuntimeData?.copyPaste ?? paymentData.pixData?.copyPaste)?.trim();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [pixRuntimeData?.copyPaste, paymentData.pixData?.copyPaste]);

  if (runtimeStatus === 'approved') {
    return (
      <div className="flex flex-col min-h-full px-4 py-3">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-sm">
              <Check size={30} className="text-emerald-600" strokeWidth={2.8} />
            </div>
            <div className="text-center">
              <p className="text-[20px] font-extrabold text-petroleum uppercase tracking-wide">
                Pagamento confirmado!
              </p>
              <p className="text-[13px] text-petroleum/85 mt-1 font-semibold">
                Seu plano foi ativado com sucesso.
              </p>
            </div>
          </div>
          <OrderSummary
            name={planInfo.name}
            period={planInfo.period}
            amount={paymentData.amount}
          />
          <div className="rounded-luxury border border-emerald-200 bg-emerald-50/60 px-3 py-2">
            <p className="text-[12px] text-petroleum/90 leading-snug font-medium">
              Pronto! Seu pagamento foi aprovado e seu acesso já está liberado.
            </p>
          </div>
          {nextBillingDateText && (
            <div className="p-2 rounded-luxury bg-slate-50 border border-slate-100 flex items-start gap-2 text-petroleum/80">
              <CalendarCheck size={12} className="mt-0.5 shrink-0" />
              <p className="text-[11px] leading-tight font-medium">
                Proxima cobranca em <strong>{nextBillingDateText}</strong>.
              </p>
            </div>
          )}
          <SecurityBadge />
          <SupportLink />
        </div>
        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-luxury-primary w-full"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-3">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-14 h-14 rounded-full bg-gold/10 border-2 border-gold/25 flex items-center justify-center">
          {billingType === 'PIX' ? (
            <QrCode size={24} className="text-gold" />
          ) : billingType === 'BOLETO' ? (
            <Banknote size={24} className="text-gold" />
          ) : (
            <CreditCard size={24} className="text-gold" />
          )}
        </div>
        <p className="text-[15px] font-bold text-petroleum uppercase">
          {billingType === 'PIX'
            ? 'Pague com PIX'
            : billingType === 'BOLETO'
              ? 'Boleto gerado'
              : 'Pagamento processado'}
        </p>
      </div>

      <OrderSummary name={planInfo.name} period={planInfo.period} amount={paymentData.amount} />

      {paymentData.errorMessage && (
        <div className="rounded-luxury border border-red-300 bg-red-50 px-3 py-2 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-700">{paymentData.errorMessage}</p>
        </div>
      )}

      {(runtimeStatus === 'overdue' || runtimeStatus === 'rejected') && (
        <div className="rounded-luxury border border-amber-300 bg-amber-50 px-3 py-2 flex items-start gap-2">
          <Clock size={14} className="text-amber-700 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-[11px] text-amber-800 font-semibold">
              Regularizacao pendente.
            </p>
            <p className="text-[11px] text-amber-800">
              O plano so sera mantido apos a confirmacao do pagamento.
            </p>
          </div>
        </div>
      )}

      {billingType === 'PIX' && pixLoading && (
        <div className="py-2">
          <LoadingSpinner size="sm" message="Gerando QR Code PIX..." variant="light" />
        </div>
      )}
      {billingType === 'PIX' && !pixLoading && pixLoadError && (
        <div className="rounded-luxury border border-amber-300 bg-amber-50 px-3 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-amber-900">{pixLoadError}</p>
          <button
            type="button"
            onClick={() => {
              setPixRetryCount(0);
              loadPixData();
            }}
            className="inline-flex items-center justify-center rounded-md border border-amber-400 bg-amber-100 px-3 py-2 text-[11px] font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
          >
            Tentar novamente
          </button>
          {paymentData.paymentUrl && (
            <a
              href={paymentData.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-amber-500 bg-amber-200/60 px-3 py-2 text-[11px] font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
            >
              Abrir cobrança no Asaas
            </a>
          )}
        </div>
      )}

      {billingType === 'PIX' &&
        !pixLoading &&
        (pixRuntimeData?.qrCode || paymentData.pixData?.qrCode) && (
        <div className="flex flex-col items-center gap-2">
          <img
            src={`data:image/png;base64,${pixRuntimeData?.qrCode ?? paymentData.pixData?.qrCode}`}
            alt="QR Code PIX"
            className="w-[180px] h-[180px] rounded-lg border border-slate-200 bg-white p-2"
          />
          {!!(pixRuntimeData?.copyPaste ?? paymentData.pixData?.copyPaste) && (
            <button
              type="button"
              onClick={copyPix}
              className="inline-flex items-center gap-2 rounded-md border border-champagne bg-champagne/10 px-3 py-2 text-[11px] font-semibold text-petroleum"
            >
              <Copy size={13} />
              {copyState === 'copied'
                ? 'Copiado!'
                : copyState === 'error'
                  ? 'Falha ao copiar'
                  : 'Copiar código PIX'}
            </button>
          )}
          <div className="rounded-luxury border border-slate-100 bg-slate-50 px-3.5 py-1.5 space-y-2 w-full">
            <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70 mb-1">
              Como pagar
            </p>
            <p className="text-[11px] text-petroleum/90">1. Abra o app do seu banco.</p>
            <p className="text-[11px] text-petroleum/90">2. Escaneie o QR Code ou use copia e cola.</p>
            <p className="text-[11px] text-petroleum/90">3. Confirme o pagamento.</p>
          </div>
        </div>
      )}

      {billingType === 'BOLETO' && (
        <div className="space-y-2">
          <p className="text-[11px] text-petroleum/80 text-center">
            {dueDateText
              ? `Vencimento em ${dueDateText}.`
              : 'A cobrança vence em até 3 dias.'}
          </p>
          {paymentData.paymentUrl && (
            <a
              href={paymentData.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-luxury-primary w-full inline-flex items-center justify-center gap-2"
            >
              <FileText size={14} />
              Abrir boleto
            </a>
          )}
        </div>
      )}

      {billingType === 'CREDIT_CARD' && (
        <div className="space-y-2">
          <div className="rounded-luxury bg-amber-50 border border-amber-200/60 px-3 py-2 flex items-start gap-2">
            <Clock size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-amber-800">
                Aguardando confirmacao da operadora
              </p>
              <p className="text-[10px] text-amber-700/80 mt-0.5 leading-snug">
                A aprovacao costuma ser imediata.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70">
              O que acontece agora
            </p>
            <p className="text-[11px] font-medium text-petroleum/90 leading-snug inline-flex gap-1 items-center">
              <Sparkles size={12} className="text-gold" />
              O plano e ativado automaticamente apos aprovacao.
            </p>
          </div>
        </div>
      )}

      <button type="button" onClick={onClose} className="btn-luxury-primary w-full">
        Fechar
      </button>
      <SecurityBadge />
      <SupportLink />
    </div>
  );
}

export default StepDoneWrapper;
