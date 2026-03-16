'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  QrCode,
  CreditCard,
  User,
  Lock,
  ChevronDown,
  AlertCircle,
  Banknote,
  Tag,
} from 'lucide-react';
import { SheetSection } from '@/components/ui/Sheet';
import { FieldLabel } from '../FieldLabel';
import {
  getPeriodPrice,
  PIX_DISCOUNT_PERCENT,
  type BillingPeriod,
} from '@/core/config/plans';
import type { BillingType } from '@/core/types/billing';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { getUpgradePreview } from '@/core/services/asaas.service';
import { InfoTooltip } from '../../InfoTooltip';
import {
  formatCreditCardNumber,
  formatExpiryMonth,
  formatExpiryYear,
  formatCcv,
  formatBRLDecimal,
  formatDateLong,
} from '../utils';
import {
  validateCreditCard,
  detectBrand,
  brandLabel,
  type CardErrors,
} from '@/core/utils/creditCardValidation';
import { useUpgradePrice } from '../useUpgradePrice';

// ─── Erro inline ──────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <AlertCircle size={9} className="text-red-500 shrink-0" />
      <p className="text-[8px] text-red-500 font-medium leading-tight">
        {message}
      </p>
    </div>
  );
}

// ─── Bandeira do cartão ───────────────────────────────────────────────────────

function BrandBadge({ number }: { number: string }) {
  const brand = detectBrand(number);
  const label = brandLabel(brand);
  if (!label) return null;
  return (
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-semibold text-petroleum/40 uppercase tracking-wide pointer-events-none">
      {label}
    </span>
  );
}

// ─── Breakdown unificado do valor ────────────────────────────────────────────
/**
 * Exibe o cálculo completo em uma tabela de linhas clara:
 *
 *   Plano Anual             R$ 240,00
 *   Crédito dias não usados − R$  48,00   (se houver)
 *   Desconto PIX (10%)      − R$  19,20   (se houver)
 *   ─────────────────────────────────────
 *   Total a pagar             R$ 172,80
 *
 * Quando total = 0 → variante "Upgrade Gratuito" em verde.
 */
function PriceBreakdown({
  periodLabel,
  amountPeriod,
  residualCredit,
  pixDiscountAmount,
  amountFinal,
  isFreeUpgrade,
  nextBillingDate,
  freeUpgradeDurationText,
  creditLabel,
}: {
  periodLabel: string;
  amountPeriod: number;
  residualCredit: number;
  pixDiscountAmount: number;
  amountFinal: number;
  isFreeUpgrade: boolean;
  nextBillingDate: string;
  freeUpgradeDurationText: string;
  /** Ex.: "Crédito (direito de arrependimento)" em downgrade; senão "Crédito dos dias não usados". */
  creditLabel?: string;
}) {
  const hasCredit = residualCredit > 0;
  const hasPixDiscount = pixDiscountAmount > 0;
  const creditDisplayLabel = creditLabel ?? 'Crédito dos dias não usados';

  if (isFreeUpgrade) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-[11px] text-emerald-900 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider">
            {creditLabel ? '✓ Crédito aplicado' : '✓ Upgrade Gratuito'}
          </p>
          <InfoTooltip
            portal
            size="3xl"
            title="Como funciona o crédito"
            content="Seu plano anterior tinha dias não utilizados. O valor proporcional (pro-rata) desses dias virou crédito e cobre integralmente o novo plano para este período."
          />
        </div>

        <div className="space-y-1 text-[10.5px]">
          <div className="flex justify-between text-emerald-800/80">
            <span>Plano {periodLabel}</span>
            <span className="font-medium">
              R$ {formatBRLDecimal(amountPeriod)}
            </span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>{creditDisplayLabel}</span>
            <span className="font-semibold">
              − R$ {formatBRLDecimal(residualCredit)}
            </span>
          </div>
          <div className="flex justify-between border-t border-emerald-200 pt-1.5 font-bold text-emerald-800">
            <span>Total a pagar agora</span>
            <span>R$ 0,00</span>
          </div>
        </div>

        <p className="text-[10.5px] text-emerald-800 leading-snug">
          Seu acesso vai até{' '}
          <span className="font-semibold">{nextBillingDate}</span>
          {freeUpgradeDurationText ? ` (${freeUpgradeDurationText})` : ''}. A
          próxima fatura será nessa data.
        </p>
      </div>
    );
  }

  // Sem nenhum desconto extra → não exibe box (valor aparece só no parcelamento)
  if (!hasCredit && !hasPixDiscount) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 space-y-1 text-[11px]">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-petroleum/70 text-[10px] uppercase tracking-wider">
          Resumo do valor
        </p>
        <InfoTooltip
          portal
          size="3xl"
          title="Como o valor é calculado"
          content="O crédito dos dias não utilizados do plano anterior é abatido proporcionalmente (pro-rata). No PIX, há desconto adicional no semestral e no anual, aplicado sobre o valor já com o crédito."
        />
      </div>

      <div className="flex justify-between text-[10.5px]">
        <span className="text-petroleum/60">Plano {periodLabel}</span>
        <span className="font-medium text-petroleum">
          R$ {formatBRLDecimal(amountPeriod)}
        </span>
      </div>

      {hasCredit && (
        <div className="flex justify-between text-[10.5px] text-emerald-700">
          <span>{creditDisplayLabel}</span>
          <span className="font-semibold">
            − R$ {formatBRLDecimal(residualCredit)}
          </span>
        </div>
      )}

      {hasPixDiscount && (
        <div className="flex justify-between text-[10.5px] text-emerald-700">
          <span className="flex items-center gap-1">
            <Tag size={9} className="shrink-0" />
            Desconto PIX ({PIX_DISCOUNT_PERCENT}%)
          </span>
          <span className="font-semibold">
            − R$ {formatBRLDecimal(pixDiscountAmount)}
          </span>
        </div>
      )}

      <div className="flex justify-between border-t border-slate-200 pt-1.5">
        <span className="font-bold text-[11px] text-petroleum">
          Total a pagar
        </span>
        <span className="font-bold text-[14px] text-petroleum">
          R$ {formatBRLDecimal(amountFinal)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function StepBilling() {
  const {
    billingPeriod,
    setBillingPeriod,
    billingType,
    setBillingType,
    planInfoForPrice,
    installments,
    setInstallments,
    creditCard,
    setCreditCard,
    upgradeCalculation,
    setUpgradeCalculation,
    selectedPlan,
    segment,
    planKey,
    profile,
    isCalculationLoading: calcLoading,
    setIsCalculationLoading: setCalcLoading,
    canProceedBilling,
    setCanProceedBilling,
  } = useUpgradeSheetContext();

  const isDowngradeWithCredit =
    upgradeCalculation?.type === 'downgrade' &&
    upgradeCalculation?.is_downgrade_withdrawal_window === true &&
    (upgradeCalculation?.residual_credit ?? 0) > 0;

  // Re-busca o cálculo com o período e forma escolhidos (reflete o valor real)
  useEffect(() => {
    if (planKey === 'FREE' || selectedPlan === 'FREE' || profile?.is_trial)
      return;
    let cancelled = false;
    setCalcLoading(true);
    getUpgradePreview(selectedPlan, billingPeriod, billingType, segment).then(
      (result) => {
        if (!cancelled && result.calculation)
          setUpgradeCalculation(result.calculation);
        if (!cancelled) setCalcLoading(false);
      },
    );
    return () => {
      cancelled = true;
      setCalcLoading(false);
    };
  }, [
    billingPeriod,
    billingType,
    selectedPlan,
    segment,
    planKey,
    setUpgradeCalculation,
    setCalcLoading,
  ]);

  // ── Validação do cartão ───────────────────────────────────────────────────

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<CardErrors>({});

  const brand = detectBrand(creditCard.credit_card_number);

  useEffect(() => {
    if (billingType !== 'CREDIT_CARD') {
      setErrors({});
      // Outros meios de pagamento não dependem de cartão → passo de pagamento sempre válido
      setCanProceedBilling(true);
      return;
    }

    const nextErrors = validateCreditCard(creditCard);
    setErrors(nextErrors);

    // Sempre que recalcular os erros, atualiza a flag global de validade da etapa.
    const hasAnyError = Object.values(nextErrors ?? {}).some(Boolean);
    setCanProceedBilling(!hasAnyError);
  }, [creditCard, billingType, setCanProceedBilling]);

  useEffect(() => {
    if (billingType !== 'CREDIT_CARD') setTouched({});
  }, [billingType]);

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const err = (field: keyof CardErrors) =>
    touched[field] ? errors[field] : null;

  // ── Cálculo de preços ─────────────────────────────────────────────────────

  const maxInstallments =
    billingType === 'CREDIT_CARD' && billingPeriod === 'semiannual'
      ? 3
      : billingType === 'CREDIT_CARD' && billingPeriod === 'annual'
        ? 6
        : 1;

  useEffect(() => {
    setInstallments(1);
  }, [billingPeriod, billingType, setInstallments]);

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

  const showInstallments =
    billingType === 'CREDIT_CARD' &&
    billingPeriod !== 'monthly' &&
    amountFinal > 0;

  // Qualquer cenário em que não há valor a pagar agora (upgrade gratuito
  // ou downgrade com crédito cobrindo 100%) é tratado como "sem pagamento".
  const isZeroPayment = amountFinal === 0;

  // ── Dados para o breakdown de upgrade gratuito ────────────────────────────

  const freeUpgradeExpiryDate = upgradeCalculation?.new_expiry_date
    ? new Date(upgradeCalculation.new_expiry_date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const daysExtended = upgradeCalculation?.free_upgrade_days_extended ?? 0;
  const freeUpgradeDurationText =
    daysExtended >= 30
      ? daysExtended % 30 === 0
        ? `cerca de ${daysExtended / 30} ${daysExtended / 30 === 1 ? 'mês' : 'meses'}`
        : `cerca de ${(daysExtended / 30).toFixed(1).replace('.', ',')} meses`
      : daysExtended > 0
        ? `${daysExtended} ${daysExtended === 1 ? 'dia' : 'dias'}`
        : '';

  const periodLabels: Record<BillingPeriod, string> = {
    monthly: 'Mensal',
    semiannual: 'Semestral',
    annual: 'Anual',
  };

  const periods: {
    key: BillingPeriod;
    label: string;
    sublabel: string;
    badge?: string;
  }[] = [
    { key: 'monthly', label: 'Mensal', sublabel: 'Sem compromisso' },
    {
      key: 'semiannual',
      label: 'Semestral',
      sublabel: '6 meses',
      badge: `${getPeriodPrice(planInfoForPrice, 'semiannual').discount}% OFF`,
    },
    {
      key: 'annual',
      label: 'Anual',
      sublabel: '12 meses',
      badge: `${getPeriodPrice(planInfoForPrice, 'annual').discount}% OFF`,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  const isCalculationLoading =
    calcLoading &&
    !upgradeCalculation &&
    planKey !== 'FREE' &&
    selectedPlan !== 'FREE' &&
    !profile?.is_trial;

  return (
    <div className="space-y-0">
      {isCalculationLoading && (
        <SheetSection className="py-4 px-3">
          <div className="flex items-center gap-2 text-[11px] text-petroleum">
            <div className="w-3.5 h-3.5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            <p className="font-medium">
              Calculando crédito aplicado e próxima fatura…
            </p>
          </div>
        </SheetSection>
      )}

      {/* ── Período de cobrança ── */}
      {!isCalculationLoading && (
        <SheetSection
          title="Período de Cobrança"
          className="py-2 px-3 space-y-1.5"
        >
          <div className="grid grid-cols-3 gap-1.5">
            {periods.map(({ key, label, sublabel, badge }) => {
              const {
                effectiveMonthly: em,
                totalPrice,
                discount,
              } = getPeriodPrice(planInfoForPrice, key);
              const isSelected = billingPeriod === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBillingPeriod(key)}
                  className={`relative flex items-center gap-3 w-full rounded-lg border-2 transition-all px-3 py-2 ${
                    isSelected
                      ? 'border-gold bg-gold/10 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-gold/40'
                  }`}
                >
                  {badge && (
                    <span className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-gold text-petroleum text-[9px] font-bold uppercase rounded leading-none shadow-sm">
                      {badge}
                    </span>
                  )}

                  <div
                    className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-gold bg-gold'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>

                  <div className="flex flex-col items-start text-left overflow-hidden py-1">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wide ${isSelected ? 'text-petroleum' : 'text-petroleum/90'}`}
                      >
                        {label}
                      </span>
                      <span
                        className={`text-[12px] font-bold ${isSelected ? 'text-petroleum' : 'text-petroleum/80'}`}
                      >
                        R$ {em}
                        <span className="text-[9px] font-medium opacity-90">
                          /mês
                        </span>
                      </span>
                    </div>

                    <p className="text-[10px] text-petroleum/70 leading-tight font-medium truncate">
                      {discount > 0
                        ? `Total: R$ ${totalPrice} · ${key === 'semiannual' ? '6' : '12'} meses`
                        : sublabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Banner de economia vs mensal — oculto em upgrade gratuito */}
          {billingPeriod !== 'monthly' && !isFreeUpgrade && (
            <div className="mt-1.5 flex items-center gap-1.5 px-2 py-2 bg-emerald-50 border border-emerald-200/60 rounded-md">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <p className="text-[10px] text-emerald-700 font-semibold leading-tight">
                Economia de R${' '}
                {(planInfoForPrice.price -
                  getPeriodPrice(planInfoForPrice, billingPeriod)
                    .effectiveMonthly) *
                  getPeriodPrice(planInfoForPrice, billingPeriod).months}{' '}
                em relação ao plano mensal
              </p>
            </div>
          )}
        </SheetSection>
      )}

      {/* ── Forma de pagamento ── */}
      {!isCalculationLoading && (
        <SheetSection
          title="Forma de Pagamento"
          className="py-2 px-3 space-y-1"
        >
          {isZeroPayment && (
            <p className="text-[10px] text-petroleum/70 mb-1">
              Nenhum pagamento necessário — seu crédito cobre o plano.
            </p>
          )}
          <div className="flex gap-1.5">
            {(
              [
                {
                  value: 'CREDIT_CARD' as BillingType,
                  label: 'Cartão',
                  Icon: CreditCard,
                },
                { value: 'PIX' as BillingType, label: 'PIX', Icon: QrCode },
                {
                  value: 'BOLETO' as BillingType,
                  label: 'Boleto',
                  Icon: Banknote,
                },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                disabled={isZeroPayment}
                onClick={() => setBillingType(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[0.4rem] border transition-all flex-1 min-w-0 ${
                  isZeroPayment
                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                    : billingType === value
                      ? 'border-gold bg-gold/10 text-petroleum'
                      : 'border-slate-200 bg-slate-50 text-petroleum/50 hover:border-gold/40'
                }`}
              >
                <Icon size={14} strokeWidth={1.5} className="shrink-0" />
                <span className="text-[9px] font-semibold uppercase tracking-wide truncate">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {!isZeroPayment && (
            <p className="text-[11px] text-petroleum/90 leading-snug mt-2 mb-1">
              Pagamento via <strong className="text-petroleum">PIX</strong> tem{' '}
              <strong>{PIX_DISCOUNT_PERCENT}% de desconto</strong> no semestral
              e no anual. Parcelamento só no cartão.
            </p>
          )}
        </SheetSection>
      )}

      {/* ── Resumo do valor (breakdown unificado) ────────────────────────────
           Aparece sempre que há ao menos um desconto (crédito, PIX ou gratuito).
           Substitui os dois boxes separados anteriores.
      ── */}
      {!isCalculationLoading &&
        (residualCredit > 0 || pixDiscountActual > 0 || isFreeUpgrade) && (
          <SheetSection className="py-2 px-3">
            <PriceBreakdown
              periodLabel={periodLabels[billingPeriod]}
              amountPeriod={amountPeriod}
              residualCredit={residualCredit}
              pixDiscountAmount={pixDiscountActual}
              amountFinal={amountFinal}
              isFreeUpgrade={isFreeUpgrade}
              nextBillingDate={freeUpgradeExpiryDate}
              freeUpgradeDurationText={freeUpgradeDurationText}
              creditLabel={
                isDowngradeWithCredit ? 'Crédito de outro pagamento' : undefined
              }
            />
          </SheetSection>
        )}

      {/* ── Dados do cartão ── */}
      {!isCalculationLoading &&
        billingType === 'CREDIT_CARD' &&
        !isZeroPayment && (
          <SheetSection
            title="Dados do cartão"
            className="py-2 px-3 space-y-1.5"
          >
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <FieldLabel icon={User} label="Nome no cartão" required />
                  <input
                    type="text"
                    value={creditCard.credit_card_holder_name}
                    onChange={(e) =>
                      setCreditCard((c) => ({
                        ...c,
                        credit_card_holder_name: e.target.value,
                      }))
                    }
                    onBlur={() => touch('credit_card_holder_name')}
                    placeholder="Como está no cartão"
                    className={`w-full px-2 py-1.5 h-8 bg-slate-50 border rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none transition-colors focus:border-gold/60 ${
                      err('credit_card_holder_name')
                        ? 'border-red-300'
                        : 'border-slate-200'
                    }`}
                  />
                  <FieldError message={err('credit_card_holder_name')} />
                </div>
                <div className="space-y-0.5">
                  <FieldLabel
                    icon={CreditCard}
                    label="Número do cartão"
                    required
                  />
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={creditCard.credit_card_number}
                      onChange={(e) =>
                        setCreditCard((c) => ({
                          ...c,
                          credit_card_number: formatCreditCardNumber(
                            e.target.value,
                          ),
                        }))
                      }
                      onBlur={() => touch('credit_card_number')}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className={`w-full px-2 py-1.5 h-8 bg-slate-50 border rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none transition-colors focus:border-gold/60 pr-14 ${
                        err('credit_card_number')
                          ? 'border-red-300'
                          : 'border-slate-200'
                      }`}
                    />
                    <BrandBadge number={creditCard.credit_card_number} />
                  </div>
                  <FieldError message={err('credit_card_number')} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <FieldLabel icon={Lock} label="Validade" required />
                  <div className="flex gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={creditCard.credit_card_expiry_month}
                      onChange={(e) =>
                        setCreditCard((c) => ({
                          ...c,
                          credit_card_expiry_month: formatExpiryMonth(
                            e.target.value,
                          ),
                        }))
                      }
                      onBlur={() => touch('expiry_month')}
                      placeholder="MM"
                      className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum outline-none"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={creditCard.credit_card_expiry_year}
                      onChange={(e) =>
                        setCreditCard((c) => ({
                          ...c,
                          credit_card_expiry_year: formatExpiryYear(
                            e.target.value,
                          ),
                        }))
                      }
                      onBlur={() => touch('expiry_year')}
                      placeholder="AA"
                      maxLength={2}
                      minLength={2}
                      className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum outline-none"
                    />
                  </div>
                  {touched['expiry_month'] &&
                    touched['expiry_year'] &&
                    errors.expiry && <FieldError message={errors.expiry} />}
                </div>

                <div className="space-y-0.5">
                  <FieldLabel icon={Lock} label="CVV" required />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={creditCard.credit_card_ccv}
                    onChange={(e) =>
                      setCreditCard((c) => ({
                        ...c,
                        credit_card_ccv: formatCcv(e.target.value),
                      }))
                    }
                    onBlur={() => touch('credit_card_ccv')}
                    placeholder={brand === 'amex' ? '1234' : '123'}
                    maxLength={brand === 'amex' ? 4 : 3}
                    className={`w-full px-2 py-1.5 h-8 bg-slate-50 border rounded-[0.4rem] text-[10px] text-petroleum outline-none ${
                      err('credit_card_ccv')
                        ? 'border-red-300'
                        : 'border-slate-200'
                    }`}
                  />
                  <FieldError message={err('credit_card_ccv')} />
                </div>

                <div className="space-y-0.5">
                  <FieldLabel icon={ChevronDown} label="Parcelas" />
                  <div className="relative">
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      disabled={!showInstallments}
                      className="w-full appearance-none px-2 py-1.5 h-10 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none cursor-pointer pr-6 focus:border-gold/60"
                    >
                      {Array.from({ length: maxInstallments }, (_, i) => {
                        const n = i + 1;
                        const v = Math.round((amountFinal / n) * 100) / 100;
                        return (
                          <option key={n} value={n}>
                            {n}x de R$ {formatBRLDecimal(v)}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown
                      size={10}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-petroleum/40 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-petroleum/80">
                <p className="flex items-center gap-1">
                  <Lock size={8} /> Dados protegidos e não armazenados.
                </p>
                {showInstallments && (
                  <p className="font-semibold text-gold">
                    {installments}x de R${' '}
                    {formatBRLDecimal(amountFinal / installments)} sem juros
                  </p>
                )}
              </div>
            </div>
          </SheetSection>
        )}
    </div>
  );
}
