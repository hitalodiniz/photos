'use client';

import React from 'react';
import { CheckCircle2, QrCode, CreditCard } from 'lucide-react';
import { SheetSection } from '@/components/ui/Sheet';
import { getPeriodPrice, type BillingPeriod } from '@/core/config/plans';
import type { BillingType } from '@/core/types/billing';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';

export function StepBilling() {
  const {
    billingPeriod,
    setBillingPeriod,
    billingType,
    setBillingType,
    planInfoForPrice,
  } = useUpgradeSheetContext();

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
      <SheetSection title="Período de Cobrança">
        <div className="space-y-2">
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
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-luxury border-2 transition-all ${
                  isSelected
                    ? 'border-gold bg-gold/5 shadow-[0_0_0_3px_rgba(212,175,55,0.12)]'
                    : 'border-slate-200 bg-white hover:border-gold/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-gold bg-gold'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-petroleum" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[12px] font-bold uppercase tracking-wide ${isSelected ? 'text-petroleum' : 'text-petroleum/90'}`}
                      >
                        {label}
                      </span>
                      {badge && (
                        <span className="px-1.5 py-0.5 bg-gold text-petroleum text-[12px] font-semibold uppercase tracking-wide rounded-full">
                          {badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-petroleum/90 font-medium">
                      {sublabel}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-[14px] font-bold leading-none ${isSelected ? 'text-petroleum' : 'text-petroleum/60'}`}
                  >
                    R${effectiveMonthly}
                    <span className="text-[10px] font-medium text-petroleum/90">
                      /mês
                    </span>
                  </p>
                  {discount > 0 && (
                    <p className="text-[10px] text-petroleum/90 mt-0.5">
                      R$ {totalPrice} cobrado a cada{' '}
                      {key === 'semiannual' ? '6' : '12'} meses
                    </p>
                  )}
                  {discount === 0 && (
                    <p className="text-[10px] text-petroleum/90 mt-0.5">
                      cobrado mensalmente
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {billingPeriod !== 'monthly' && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200/60 rounded-luxury">
            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
            <p className="text-[12px] text-emerald-700 font-semibold">
              Você economiza{' '}
              <span className="font-bold">
                R${' '}
                {(planInfoForPrice.price -
                  getPeriodPrice(planInfoForPrice, billingPeriod)
                    .effectiveMonthly) *
                  getPeriodPrice(planInfoForPrice, billingPeriod).months}
              </span>{' '}
              comparado ao plano mensal
            </p>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Forma de Pagamento">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: 'PIX' as BillingType, label: 'PIX', Icon: QrCode },
              {
                value: 'CREDIT_CARD' as BillingType,
                label: 'Cartão',
                Icon: CreditCard,
              },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBillingType(value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-luxury border-2 transition-all ${
                billingType === value
                  ? 'border-gold bg-gold/10 text-petroleum'
                  : 'border-slate-200 bg-slate-50 text-petroleum/50 hover:border-gold/40'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {label}
              </span>
            </button>
          ))}
        </div>
      </SheetSection>
    </div>
  );
}
