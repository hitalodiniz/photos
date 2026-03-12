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
} from 'lucide-react';
import { SheetSection } from '@/components/ui/Sheet';
import { FieldLabel } from '../FieldLabel';
import {
  getPeriodPrice,
  getPixAdjustedTotal,
  PIX_DISCOUNT_PERCENT,
  type BillingPeriod,
} from '@/core/config/plans';
import type { BillingType } from '@/core/types/billing';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { getFreeUpgradeCoverageText } from '../utils';
import { getUpgradePreview } from '@/core/services/asaas.service';
import { InfoTooltip } from '../../InfoTooltip';
import {
  formatCreditCardNumber,
  formatExpiryMonth,
  formatExpiryYear,
  formatCcv,
} from '../utils';
import {
  validateCreditCard,
  validateCardNumber,
  validateCardHolder,
  validateExpiryMonth,
  validateExpiryYear,
  validateExpiry,
  validateCvv,
  detectBrand,
  brandLabel,
  isCardValid,
  type CardErrors,
} from '@/core/utils/creditCardValidation';
import { div } from 'framer-motion/client';

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Componente de erro inline ────────────────────────────────────────────────

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

// ─── Ícone de bandeira ────────────────────────────────────────────────────────

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
  } = useUpgradeSheetContext();

  // Atualizar cálculo de upgrade ao mudar período/forma no Step Billing para o box de Upgrade Gratuito refletir o ciclo correto (mensal/semestral/anual)
  useEffect(() => {
    if (planKey === 'FREE' || selectedPlan === 'FREE' || profile?.is_trial)
      return;
    let cancelled = false;
    getUpgradePreview(selectedPlan, billingPeriod, billingType, segment).then(
      (result) => {
        if (!cancelled && result.calculation)
          setUpgradeCalculation(result.calculation);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    billingPeriod,
    billingType,
    selectedPlan,
    segment,
    planKey,
    setUpgradeCalculation,
  ]);

  // ── Estado de erros — só exibido após blur (touched) ──────────────────────
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<CardErrors>({});

  const brand = detectBrand(creditCard.credit_card_number);

  // Recalcula erros a cada mudança no cartão
  useEffect(() => {
    if (billingType !== 'CREDIT_CARD') return;
    const e = validateCreditCard(creditCard);
    setErrors(e);
  }, [creditCard, billingType]);

  // Ao trocar para PIX, marcar cartão como válido (não necessário)
  useEffect(() => {
    if (billingType !== 'CREDIT_CARD') {
      setTouched({});
    }
  }, [billingType]);

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const err = (field: keyof CardErrors) =>
    touched[field] ? errors[field] : null;

  // Erro de expiração combinado: só mostrar se ambos os campos foram tocados
  const expiryError =
    touched['expiry_month'] && touched['expiry_year'] ? errors.expiry : null;

  // ── Período e preços ──────────────────────────────────────────────────────

  const maxInstallments =
    billingType === 'CREDIT_CARD' && billingPeriod === 'semiannual'
      ? 3
      : billingType === 'CREDIT_CARD' && billingPeriod === 'annual'
        ? 6
        : 1;

  useEffect(() => {
    setInstallments(1);
  }, [billingPeriod, billingType, setInstallments]);

  const { effectiveMonthly, months } = getPeriodPrice(
    planInfoForPrice,
    billingPeriod,
  );
  const amountOriginal = Math.round(effectiveMonthly * months * 100) / 100;
  const pixAdjusted = getPixAdjustedTotal(planInfoForPrice, billingPeriod);
  const amountFromPlan =
    billingType === 'PIX' && billingPeriod !== 'monthly'
      ? pixAdjusted.totalWithPixDiscount
      : amountOriginal;

  // Quando há cálculo de upgrade com crédito, usar amount_final (valor já descontado) e exibir o saldo
  const hasUpgradeCredit =
    upgradeCalculation?.type === 'upgrade' &&
    (upgradeCalculation.residual_credit ?? 0) > 0;
  const amountFinal =
    hasUpgradeCredit &&
    typeof upgradeCalculation.amount_final === 'number' &&
    Number.isFinite(upgradeCalculation.amount_final)
      ? upgradeCalculation.amount_final
      : amountFromPlan;

  const showInstallments =
    billingType === 'CREDIT_CARD' &&
    billingPeriod !== 'monthly' &&
    amountFinal > 0;

  const showPixDiscount = billingType === 'PIX' && billingPeriod !== 'monthly';

  const isFreeUpgrade = upgradeCalculation?.is_free_upgrade === true;
  const freeUpgradeCoverageText = getFreeUpgradeCoverageText(
    billingPeriod,
    upgradeCalculation ?? null,
  );
  const freeUpgradeExpiryDate = upgradeCalculation?.new_expiry_date
    ? new Date(upgradeCalculation.new_expiry_date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const daysExtended = upgradeCalculation?.free_upgrade_days_extended ?? 0;
  const freeUpgradeMonthsText =
    daysExtended >= 30
      ? daysExtended % 30 === 0
        ? `cerca de ${daysExtended / 30} ${daysExtended / 30 === 1 ? 'mês' : 'meses'}`
        : `cerca de ${(daysExtended / 30).toFixed(1).replace('.', ',')} meses`
      : daysExtended > 0
        ? `${daysExtended} ${daysExtended === 1 ? 'dia' : 'dias'}`
        : '';

  const billingPeriodExplanation =
    billingPeriod === 'monthly'
      ? 'Cálculo mensal: valor do plano para 1 mês (30 dias comerciais). O crédito dos dias não utilizados do plano anterior é abatido; você paga apenas a diferença.'
      : billingPeriod === 'semiannual'
        ? 'Cálculo semestral: valor do plano para 6 meses (180 dias comerciais). O crédito pro-rata do plano anterior é abatido do valor do semestre. No PIX há 10% de desconto sobre o valor já descontado.'
        : 'Cálculo anual: valor do plano para 12 meses (360 dias comerciais). O crédito pro-rata é abatido do valor do ano. No PIX há 10% de desconto sobre o valor já descontado.';

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

  return (
    <div className="space-y-0">
      {/* ── Upgrade Gratuito (saldo cobre o plano) ── */}
      {isFreeUpgrade && freeUpgradeExpiryDate && (
        <SheetSection className="py-2 px-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-900">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="font-semibold text-emerald-700">Upgrade Gratuito</p>
              <InfoTooltip
                portal
                size="3xl"
                title="Como funciona"
                content={billingPeriodExplanation}
              />
            </div>
            <p className="mb-1 font-medium">
              Crédito de{' '}
              <span className="font-semibold text-emerald-800">
                R$ {formatBRL(upgradeCalculation!.residual_credit ?? 0)}
              </span>{' '}
              (dias não utilizados do plano anterior).
            </p>
            <p className="font-medium">
              Seu crédito dá direito a uso até{' '}
              <span className="font-semibold">{freeUpgradeExpiryDate}</span>
              {freeUpgradeMonthsText ? ` (${freeUpgradeMonthsText})` : ''}.
              Nenhum valor a pagar. A próxima cobrança será em{' '}
              <span className="font-semibold">{freeUpgradeExpiryDate}</span>.
            </p>
          </div>
        </SheetSection>
      )}

      {/* ── Saldo (crédito) e diferença a pagar — exibir para qualquer plano/período quando houver crédito ── */}
      {hasUpgradeCredit && !isFreeUpgrade && (
        <SheetSection className="py-2 px-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="font-semibold text-petroleum/90">
                Crédito e valor a pagar
              </p>
              <InfoTooltip
                portal
                size="3xl"
                title="Cálculo por período"
                content={billingPeriodExplanation}
              />
            </div>
            <p className="mb-1 font-medium">
              Crédito de{' '}
              <span className="font-semibold text-petroleum">
                R$ {formatBRL(upgradeCalculation!.residual_credit!)}
              </span>{' '}
              (dias não utilizados do plano anterior).
            </p>
            <p className="font-medium">
              Valor do período:{' '}
              <span className="font-semibold">
                R$ {formatBRL(upgradeCalculation!.amount_original!)}
              </span>
              {' — '}
              Você paga apenas a diferença de{' '}
              <span className="font-semibold text-petroleum">
                R$ {formatBRL(amountFinal)}
              </span>
              .
            </p>
          </div>
        </SheetSection>
      )}

      {/* ── Período de cobrança ── */}
      <SheetSection
        title="Período de Cobrança"
        className="py-2 px-3 space-y-1.5"
      >
        <div className="grid grid-cols-3 gap-1.5">
          {periods.map(({ key, label, sublabel, badge }) => {
            const { effectiveMonthly, totalPrice, discount } = getPeriodPrice(
              planInfoForPrice,
              key,
            );
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
                {/* Badge de Desconto (opcional, ajustado para a direita) */}
                {badge && (
                  <span className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-gold text-petroleum text-[9px] font-bold uppercase rounded leading-none shadow-sm">
                    {badge}
                  </span>
                )}

                {/* Bolinha de Seleção (Radio Customizado) à esquerda */}
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

                {/* Conteúdo de Texto Alinhado à Esquerda */}
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
                      R$ {effectiveMonthly}
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

        {billingPeriod !== 'monthly' && (
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

      {/* ── Forma de pagamento ── */}
      <SheetSection title="Forma de Pagamento" className="py-2 px-3 space-y-1">
        {isFreeUpgrade && (
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
              disabled={isFreeUpgrade}
              onClick={() => setBillingType(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[0.4rem] border transition-all flex-1 min-w-0 ${
                isFreeUpgrade
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

        <div className="mt-2 mb-2">
          <p className="text-[11px] text-petroleum/90 leading-snug">
            Pagamento via <strong className="text-petroleum">PIX</strong> tem{' '}
            <strong>{PIX_DISCOUNT_PERCENT}% de desconto</strong> no semestral e
            no anual. Parcelamento só no cartão.
          </p>
        </div>

        {showPixDiscount && (
          <div className="mt-1 flex items-center gap-1.5 px-2 py-2 bg-emerald-50 border border-emerald-200/60 rounded-md">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <p className="text-[11px] text-emerald-700 font-semibold leading-tight">
              Você paga R$ {formatBRL(amountFinal)} com {PIX_DISCOUNT_PERCENT}%
              de desconto no PIX
              {pixAdjusted.discountAmount > 0 && (
                <span className="text-emerald-900 font-normal">
                  {' '}
                  (economize R$ {formatBRL(pixAdjusted.discountAmount)})
                </span>
              )}
            </p>
          </div>
        )}
      </SheetSection>

      {/* ── Parcelamento ── */}
      {/* ── Dados do cartão ── */}
      {billingType === 'CREDIT_CARD' && !isFreeUpgrade && (
        <SheetSection title="Dados do cartão" className="py-2 px-3 space-y-1.5">
          <div className="space-y-2">
            {/* Nome no cartão + Número do cartão */}
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

            {/* Validade + CVV + Parcelamento */}
            <div className="grid grid-cols-3 gap-2">
              {/* Validade */}
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
                    placeholder="AA"
                    className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum outline-none"
                  />
                </div>
              </div>

              {/* CVV */}
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
                  placeholder={brand === 'amex' ? '1234' : '123'}
                  maxLength={brand === 'amex' ? 4 : 3}
                  className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum outline-none"
                />
              </div>

              {/* Parcelamento */}
              <div className="space-y-0.5">
                <FieldLabel icon={ChevronDown} label="Parcelas" />
                <div className="relative">
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    disabled={!showInstallments}
                    className="w-full appearance-none px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[9.5px] text-petroleum font-medium outline-none cursor-pointer pr-6 focus:border-gold/60"
                  >
                    {Array.from({ length: maxInstallments }, (_, i) => {
                      const n = i + 1;
                      const v = Math.round((amountFinal / n) * 100) / 100;
                      return (
                        <option key={n} value={n}>
                          {n}x de R$ {formatBRL(v)}
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

            {/* Informativo de valor parcelado */}
            <div className="flex items-center justify-between text-[10px] text-petroleum/80">
              <p className="flex items-center gap-1">
                <Lock size={8} /> Dados protegidos e não armazenados.
              </p>
              {showInstallments && (
                <p className="font-semibold text-gold">
                  {installments}x de R$ {formatBRL(amountFinal / installments)}{' '}
                  sem juros
                </p>
              )}
            </div>
          </div>
        </SheetSection>
      )}
    </div>
  );
}
