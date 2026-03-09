'use client';

import React, { useEffect } from 'react';
import {
  CheckCircle2,
  QrCode,
  CreditCard,
  User,
  Lock,
  ChevronDown,
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
import {
  formatCreditCardNumber,
  formatExpiryMonth,
  formatExpiryYear,
  formatCcv,
} from '../utils';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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
  } = useUpgradeSheetContext();

  const maxInstallments =
    billingType === 'CREDIT_CARD' && billingPeriod === 'semiannual'
      ? 3
      : billingType === 'CREDIT_CARD' && billingPeriod === 'annual'
        ? 6
        : 1;

  // Reset installments when period or billing type changes
  useEffect(() => {
    setInstallments(1);
  }, [billingPeriod, billingType, setInstallments]);

  const showInstallments =
    billingType === 'CREDIT_CARD' && billingPeriod !== 'monthly';

  const { effectiveMonthly, months } = getPeriodPrice(
    planInfoForPrice,
    billingPeriod,
  );
  const amountOriginal = Math.round(effectiveMonthly * months * 100) / 100;
  const pixAdjusted = getPixAdjustedTotal(planInfoForPrice, billingPeriod);
  const amountFinal =
    billingType === 'PIX' && billingPeriod !== 'monthly'
      ? pixAdjusted.totalWithPixDiscount
      : amountOriginal;
  const showPixDiscount = billingType === 'PIX' && billingPeriod !== 'monthly';

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

  return (
    <div className="space-y-0">
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
                className={`relative flex flex-col items-center text-center rounded-lg border-2 transition-all px-2 py-2.5 min-h-0 ${
                  isSelected
                    ? 'border-gold bg-gold/10 shadow-[0_0_0_2px_rgba(212,175,55,0.15)]'
                    : 'border-slate-200 bg-white hover:border-gold/40'
                }`}
              >
                {badge && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-gold text-petroleum text-[10px] font-semibold uppercase rounded leading-none">
                    {badge}
                  </span>
                )}
                <div
                  className={`w-4 h-4 rounded-full border-2 shrink-0 mb-1.5 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-gold bg-gold'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && (
                    <div className="w-1 h-1 rounded-full bg-petroleum" />
                  )}
                </div>
                {/* Linha 1: nome do plano + preço/mês */}
                <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0 leading-tight">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wide ${isSelected ? 'text-petroleum' : 'text-petroleum/90'}`}
                  >
                    {label}
                  </span>
                  <span
                    className={`text-[13px] font-bold ${isSelected ? 'text-petroleum' : 'text-petroleum/80'}`}
                  >
                    R$ {effectiveMonthly}
                    <span className="text-[8px] font-medium text-petroleum/70">
                      /mês
                    </span>
                  </span>
                </div>
                {/* Linha 2: sublabel ou total · período */}
                {discount > 0 ? (
                  <p className="text-[9px] text-petroleum/80 leading-tight mt-1 font-medium">
                    R$ {totalPrice} · {key === 'semiannual' ? '6' : '12'} meses
                  </p>
                ) : (
                  <span className="text-[9px] text-petroleum/80 leading-tight mt-1 block font-medium">
                    {sublabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {billingPeriod !== 'monthly' && (
          <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200/60 rounded-md">
            <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
            <p className="text-[9px] text-emerald-700 font-semibold leading-tight">
              Economia de R${' '}
              {(planInfoForPrice.price -
                getPeriodPrice(planInfoForPrice, billingPeriod)
                  .effectiveMonthly) *
                getPeriodPrice(planInfoForPrice, billingPeriod).months}{' '}
              vs. mensal
            </p>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Forma de Pagamento" className="py-2 px-3 space-y-1">
        <div className="flex gap-1.5">
          {(
            [
              {
                value: 'CREDIT_CARD' as BillingType,
                label: 'Cartão',
                Icon: CreditCard,
              },
              { value: 'PIX' as BillingType, label: 'PIX', Icon: QrCode },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBillingType(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[0.4rem] border transition-all flex-1 min-w-0 ${
                billingType === value
                  ? 'border-gold bg-gold/10 text-petroleum'
                  : 'border-slate-200 bg-slate-50 text-petroleum/50 hover:border-gold/40'
              }`}
            >
              <Icon size={14} strokeWidth={1.5} className="shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-wide truncate">
                {label}
              </span>
            </button>
          ))}
        </div>
        {billingPeriod !== 'monthly' && (
          <p className="text-[8px] text-petroleum/70 mt-1 leading-snug">
            Pagamento via <strong className="text-petroleum">PIX</strong> tem{' '}
            <strong>{PIX_DISCOUNT_PERCENT}% de desconto</strong> no semestral e
            no anual.
          </p>
        )}
        {showPixDiscount && (
          <div className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200/60 rounded-md">
            <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
            <p className="text-[9px] text-emerald-700 font-semibold leading-tight">
              Você paga <strong>R$ {formatBRL(amountFinal)}</strong> com{' '}
              {PIX_DISCOUNT_PERCENT}% de desconto no PIX
              {pixAdjusted.discountAmount > 0 && (
                <span className="text-emerald-600/90 font-normal">
                  {' '}
                  (economia R$ {formatBRL(pixAdjusted.discountAmount)})
                </span>
              )}
            </p>
          </div>
        )}
      </SheetSection>

      {showInstallments && (
        <SheetSection title="Parcelamento" className="py-2 px-3 space-y-1">
          <div className="space-y-1">
            <div className="relative">
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="w-full appearance-none px-2.5 py-2 h-9 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[11px] text-petroleum font-medium outline-none cursor-pointer pr-7 focus:border-gold/60 transition-colors"
              >
                {Array.from({ length: maxInstallments }, (_, i) => {
                  const n = i + 1;
                  const parcelValue = Math.round((amountFinal / n) * 100) / 100;
                  return (
                    <option key={n} value={n}>
                      {n === 1
                        ? `1x de R$ ${formatBRL(parcelValue)} sem juros`
                        : `${n}x de R$ ${formatBRL(parcelValue)} sem juros`}
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-petroleum/50 pointer-events-none"
              />
            </div>
            <p className="text-[8px] text-petroleum/60 leading-tight">
              Total: R$ {formatBRL(amountFinal)} — parcelado sem juros no cartão
            </p>
          </div>
        </SheetSection>
      )}

      {billingType === 'CREDIT_CARD' && (
        <SheetSection title="Dados do cartão" className="py-2 px-3 space-y-1.5">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1.2fr] gap-1.5">
              <div className="space-y-0.5 min-w-0">
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
                  placeholder="Como está no cartão"
                  className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
                />
              </div>
              <div className="space-y-0.5 min-w-0">
                <FieldLabel
                  icon={CreditCard}
                  label="Número do cartão"
                  required
                />
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
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
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
                    maxLength={2}
                    className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
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
                    maxLength={4}
                    className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
                  />
                </div>
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
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-2 py-1.5 h-8 bg-slate-50 border border-slate-200 rounded-[0.4rem] text-[10px] text-petroleum font-medium outline-none"
                />
                <p className="text-[8px] text-petroleum/60">
                  3 ou 4 dígitos atrás do cartão
                </p>
              </div>
            </div>
            <p className="text-[8px] text-petroleum/60 leading-tight pt-0.5">
              Os dados do cartão não são armazenados; são processados pela
              plataforma parceira de pagamentos.
            </p>
          </div>
        </SheetSection>
      )}
    </div>
  );
}
