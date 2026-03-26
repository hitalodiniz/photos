'use client';

import React, { useEffect, useState } from 'react';
import { SheetSection } from '@/components/ui/Sheet';
import { getPeriodPrice, PIX_DISCOUNT_PERCENT } from '@/core/config/plans';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { getUpgradePreview } from '@/core/services/asaas.service';
import { Banknote, CreditCard, Tag, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { formatBRL } from '../utils';
import { useUpgradePrice } from '../useUpgradePrice';
import { addDays } from '@/core/services/asaas/utils/dates';

export function StepConfirm() {
  const {
    setStep,
    selectedPlan,
    selectedPlanInfo,
    selectedPerms,
    billingPeriod,
    billingType,
    planInfoForPrice,
    personal,
    address,
    requestError,
    setRequestError,
    segment,
    couponCode,
    upgradeCalculation,
    setUpgradeCalculation,
    isCalculationLoading: calcLoading,
    setIsCalculationLoading: setCalcLoading,
    installments,
  } = useUpgradeSheetContext();

  const { showToast, ToastElement } = useToast();

  useEffect(() => {
    if (requestError) showToast(requestError, 'error');

    return () => {
      setRequestError(null); // limpa ao sair da tela (voltar ou fechar)
    };
  }, [requestError]);

  // Re-busca o cálculo com período e forma finais
  useEffect(() => {
    if (selectedPlan === 'FREE') return;
    let cancelled = false;
    setCalcLoading(true);
    getUpgradePreview(
      selectedPlan,
      billingPeriod,
      billingType,
      segment,
      couponCode,
    ).then((r) => {
      if (!cancelled && r.calculation) setUpgradeCalculation(r.calculation);
      if (!cancelled) setCalcLoading(false);
    });
    return () => {
      cancelled = true;
      setCalcLoading(false);
    };
  }, [
    selectedPlan,
    billingPeriod,
    billingType,
    segment,
    couponCode,
    setUpgradeCalculation,
    setCalcLoading,
  ]);

  // ── Cálculo do total final ────────────────────────────────────────────────

  const {
    amountPeriod,
    residualCredit,
    pixDiscountActual,
    amountFinal,
    isFreeUpgrade,
  } = useUpgradePrice(
    planInfoForPrice,
    billingPeriod,
    billingType,
    upgradeCalculation,
  );

  const hasPixDiscount = pixDiscountActual > 0;
  const couponDiscountAmount = Math.max(
    0,
    upgradeCalculation?.coupon_discount_amount ?? 0,
  );
  const couponCodeApplied = upgradeCalculation?.coupon_code_applied ?? null;
  const hasCouponDiscount = couponDiscountAmount > 0;
  const hasCredit = residualCredit > 0;
  const showFinancialSummary =
    hasCredit || hasPixDiscount || hasCouponDiscount || isFreeUpgrade;

  const isZeroPayment = amountFinal === 0;

  const isDowngradeWithCredit =
    upgradeCalculation?.type === 'downgrade' &&
    upgradeCalculation?.is_downgrade_withdrawal_window === true &&
    (upgradeCalculation?.residual_credit ?? 0) > 0;

  const isScheduledDowngrade =
    upgradeCalculation?.type === 'downgrade' &&
    upgradeCalculation?.is_downgrade_withdrawal_window === false;

  const creditLabel = isDowngradeWithCredit
    ? 'Crédito de outro pagamento'
    : 'Crédito dos dias não usados';
  const proRataDetails = React.useMemo(() => {
    if (!hasCredit) return null;
    const expiresAtRaw = upgradeCalculation?.current_plan_expires_at;
    if (!expiresAtRaw) return null;
    const expiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(expiresAt.getTime())) return null;
    const remainingMs = expiresAt.getTime() - Date.now();
    if (remainingMs <= 0) return null;
    const daysUnused = Math.max(
      1,
      Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
    );
    const valuePerDay = residualCredit / daysUnused;
    return { daysUnused, valuePerDay };
  }, [hasCredit, upgradeCalculation?.current_plan_expires_at, residualCredit]);

  const nextBillingDateFormatted = React.useMemo(() => {
    if (!upgradeCalculation?.new_expiry_date) return null;

    // new_expiry_date representa o fim do ciclo atual;
    // a próxima fatura é no dia seguinte
    const expiryDate = new Date(upgradeCalculation.new_expiry_date);
    const invoiceDate = addDays(expiryDate, 1);
    return invoiceDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [upgradeCalculation?.new_expiry_date]);

  const scheduledCurrentPlanEndsAt = React.useMemo(() => {
    if (!isScheduledDowngrade) return null;
    const iso =
      upgradeCalculation?.current_plan_expires_at ??
      upgradeCalculation?.downgrade_effective_at;
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [
    isScheduledDowngrade,
    upgradeCalculation?.current_plan_expires_at,
    upgradeCalculation?.downgrade_effective_at,
  ]);

  const scheduledNewPlanStartsAt = React.useMemo(() => {
    if (!isScheduledDowngrade) return null;
    const iso =
      upgradeCalculation?.downgrade_effective_at ??
      upgradeCalculation?.current_plan_expires_at;
    if (!iso) return null;
    const startsAt = addDays(new Date(iso), 1);
    return startsAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [
    isScheduledDowngrade,
    upgradeCalculation?.downgrade_effective_at,
    upgradeCalculation?.current_plan_expires_at,
  ]);

  const periodLabel =
    billingPeriod === 'monthly'
      ? 'Mensal'
      : billingPeriod === 'semiannual'
        ? 'Semestral'
        : 'Anual';

  // ✅ Ícone e texto da forma de pagamento
  const PaymentIcon =
    billingType === 'CREDIT_CARD'
      ? CreditCard
      : billingType === 'PIX'
        ? QrCode
        : Banknote;

  const paymentMethodLabel =
    billingType === 'CREDIT_CARD'
      ? 'Cartão de Crédito'
      : billingType === 'PIX'
        ? 'PIX'
        : 'Boleto Bancário';

  const installmentsSuffix =
    billingType === 'CREDIT_CARD'
      ? ` - ${installments}x sem juros de ${formatBRL(amountFinal / installments)}`
      : '';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Plano selecionado ── */}
      <SheetSection>
        <div className="relative px-3.5 py-1 rounded-luxury border border-slate-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setStep('plan')}
            className="absolute top-3.5 right-3.5 text-[10px] font-semibold text-gold hover:underline shrink-0"
          >
            Alterar
          </button>

          <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70">
            Plano selecionado
          </p>

          <div className="flex items-center gap-2">
            {selectedPlanInfo?.icon && (
              <selectedPlanInfo.icon
                size={16}
                className="text-petroleum"
                strokeWidth={1.5}
              />
            )}
            <p className="text-[14px] font-bold text-petroleum uppercase tracking-wide">
              {selectedPlanInfo?.name ?? selectedPlan}
              <span className="mx-2 text-slate-300 font-light">|</span>
              <span className="text-gold">
                R${' '}
                {
                  getPeriodPrice(planInfoForPrice, billingPeriod)
                    .effectiveMonthly
                }
              </span>
              <span className="text-[10px] font-medium text-petroleum/60 lowercase ml-0.5">
                /mês
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-champagne text-petroleum rounded">
              {periodLabel}
            </span>
            <span className="text-[11px] text-petroleum/70">
              Até {selectedPerms.maxPhotosPerGallery} fotos e vídeos por galeria
              · Até {selectedPerms.maxGalleriesHardCap} galerias
            </span>
          </div>
        </div>
      </SheetSection>

      {/* ── Dados de faturamento ── */}
      <SheetSection title="Dados de faturamento">
        <div className="relative px-3.5 py-1 rounded-luxury border border-slate-100 bg-white shadow-sm">
          <button
            onClick={() => setStep('personal')}
            className="absolute top-3.5 right-3.5 text-[10px] font-semibold text-gold hover:underline"
          >
            Editar
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
                Nome
              </p>
              <p className="text-[11px] font-medium text-petroleum mt-0.5">
                {personal.fullName || '—'}
              </p>
            </div>
            <div className="sm:col-span-3">
              <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
                CPF/CNPJ
              </p>
              <p className="text-[11px] font-medium text-petroleum mt-0.5">
                {personal.cpfCnpj}
              </p>
            </div>
            <div className="sm:col-span-3">
              <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
                WhatsApp
              </p>
              <p className="text-[11px] font-medium text-petroleum mt-0.5">
                {personal.whatsapp}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-3 p-3.5 rounded-luxury border border-slate-100 bg-white shadow-sm">
          <button
            onClick={() => setStep('personal')}
            className="absolute top-3.5 right-3.5 text-[10px] font-semibold text-gold hover:underline"
          >
            Editar
          </button>
          <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
            Endereço
          </p>
          <p className="text-[11px] font-medium text-petroleum mt-0.5">
            {address.street}, {address.number}
            {address.complement ? ` – ${address.complement}` : ''},{' '}
            {address.neighborhood}, {address.city}/{address.state} –{' '}
            {address.cep}
          </p>
        </div>
      </SheetSection>

      {/* ── Resumo do pagamento (COM forma de pagamento integrada) ── */}
      {showFinancialSummary ? (
        <SheetSection title="Resumo do pagamento">
          <div className="px-3.5 py-1 rounded-luxury border border-slate-100 bg-white shadow-sm space-y-2">
            {calcLoading && (
              <div className="flex items-center gap-2 text-[11px] text-petroleum/80 mb-1.5">
                <div className="w-3.5 h-3.5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                <span>Calculando crédito aplicado e próxima fatura…</span>
              </div>
            )}

            {/* ✅ FORMA DE PAGAMENTO (primeira linha) */}
            <div className="relative flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PaymentIcon size={16} className="text-petroleum/70" />
                <p className="text-[12px] font-semibold text-petroleum">
                  {paymentMethodLabel}
                  {installmentsSuffix}
                </p>
              </div>
              <button
                onClick={() => setStep('billing')}
                className="text-[10px] font-semibold text-gold hover:underline"
              >
                Editar
              </button>
            </div>

            {/* Linha: valor do período */}
            <div className="flex justify-between text-[11px]">
              <span className="text-petroleum/70 font-medium">
                Plano {periodLabel}
              </span>
              <span className="text-petroleum font-medium">
                {formatBRL(amountPeriod)}
              </span>
            </div>

            {/* Linha: crédito */}
            {hasCredit && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-emerald-600">
                  <span className="font-medium">{creditLabel}</span>
                  <span className="font-bold">
                    − {formatBRL(residualCredit)}
                  </span>
                </div>
                {proRataDetails && (
                  <p className="text-[10px] text-emerald-700/90">
                    Cálculo do pro-rata: {proRataDetails.daysUnused} dias não
                    usados × {formatBRL(proRataDetails.valuePerDay)}/dia
                  </p>
                )}
              </div>
            )}

            {/* Linha: desconto PIX */}
            {hasPixDiscount && (
              <div className="flex justify-between text-[11px] text-emerald-600">
                <span className="font-medium flex items-center gap-1">
                  <Tag size={10} />
                  Desconto PIX ({PIX_DISCOUNT_PERCENT}%)
                </span>
                <span className="font-bold">
                  − {formatBRL(pixDiscountActual)}
                </span>
              </div>
            )}
            {hasCouponDiscount && (
              <div className="flex justify-between text-[11px] text-emerald-600">
                <span className="font-medium flex items-center gap-1">
                  <Tag size={10} />
                  Desconto cupom{' '}
                  {couponCodeApplied ? `(${couponCodeApplied})` : ''}
                </span>
                <span className="font-bold">
                  − {formatBRL(couponDiscountAmount)}
                </span>
              </div>
            )}

            {/* Linha: total */}
            <div className="flex justify-between border-t border-slate-100 pt-1 ">
              <span className="text-[12px] font-bold text-petroleum">
                Total a pagar
              </span>
              <span className="text-[13px] font-bold text-petroleum">
                {isZeroPayment ? 'R$ 0,00' : formatBRL(amountFinal)}
              </span>
            </div>

            {/* Próxima fatura */}
            {nextBillingDateFormatted && (
              <div className="mt-1 p-2 rounded bg-slate-50 border border-slate-100 flex items-start gap-2 text-petroleum/80">
                <PaymentIcon size={12} className="mt-0.5 shrink-0" />
                <p className="text-[12px] leading-tight font-medium">
                  {isZeroPayment
                    ? 'Nenhuma cobrança agora. Próxima fatura em '
                    : 'Próxima fatura em '}
                  <strong>{nextBillingDateFormatted}</strong>.
                  {!isFreeUpgrade &&
                    (billingType === 'CREDIT_CARD'
                      ? ' Cobrança automática no cartão.'
                      : ' Pagamento manual via Boleto/PIX.')}
                </p>
              </div>
            )}
          </div>
        </SheetSection>
      ) : (
        <SheetSection title="Resumo do pagamento">
          <div className="p-3.5 rounded-luxury border border-slate-100 bg-white shadow-sm space-y-4">
            {/* ✅ FORMA DE PAGAMENTO */}
            <div className="relative flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PaymentIcon size={16} className="text-petroleum/70" />
                <p className="text-[12px] font-semibold text-petroleum">
                  {paymentMethodLabel}
                  {installmentsSuffix}
                </p>
              </div>
              <button
                onClick={() => setStep('billing')}
                className="text-[10px] font-semibold text-gold hover:underline"
              >
                Editar
              </button>
            </div>

            {/* Total */}
            <div className="flex justify-between">
              <span className="text-[12px] font-bold text-petroleum">
                Total a pagar
              </span>
              <span className="text-[13px] font-bold text-petroleum">
                {formatBRL(amountFinal)}
              </span>
            </div>

            {/* Próxima fatura */}
            {nextBillingDateFormatted && (
              <p className="text-[12px] text-petroleum/60 font-medium border-t border-slate-100 pt-1">
                Próxima fatura em{' '}
                <strong className="text-petroleum/80">
                  {nextBillingDateFormatted}
                </strong>
                .
              </p>
            )}
          </div>
        </SheetSection>
      )}

      {/* ── Downgrade agendado (fora dos 7 dias) ── */}
      {isScheduledDowngrade &&
        scheduledCurrentPlanEndsAt &&
        scheduledNewPlanStartsAt && (
          <SheetSection>
            <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
              <p className="text-[12px] leading-snug font-medium">
                Downgrade agendado: seu plano atual permanece ativo até{' '}
                <strong>{scheduledCurrentPlanEndsAt}</strong>.
              </p>
              <p className="text-[12px] leading-snug font-medium mt-0.5">
                A nova assinatura inicia em{' '}
                <strong>{scheduledNewPlanStartsAt}</strong> e{' '}
                {billingType === 'CREDIT_CARD'
                  ? 'a cobrança recorrente no cartão começa nessa data.'
                  : 'o primeiro vencimento será nessa data.'}
              </p>
            </div>
          </SheetSection>
        )}

      {/* ── Aviso de abertura mão do estorno (downgrade com crédito dentro dos 7 dias) ── */}
      {isDowngradeWithCredit && (
        <SheetSection>
          <p className="text-[10px] text-petroleum leading-snug px-1">
            Ao confirmar, você abre mão do direito de estorno e opta por aplicar
            o crédito novo plano, conforme a{' '}
            <a
              href="/politica-cancelamento"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline hover:text-gold/70 transition-colors"
            >
              política de cancelamento
            </a>
            .
          </p>
        </SheetSection>
      )}

      {ToastElement}
    </>
  );
}
