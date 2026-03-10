'use client';

import React, { useEffect } from 'react';
import { SheetSection } from '@/components/ui/Sheet';
import { getPeriodPrice } from '@/core/config/plans';
import { storageLabel } from '../utils';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { getUpgradePreview } from '@/core/services/asaas.service';

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function StepConfirm() {
  const {
    setStep,
    selectedPlan,
    selectedPlanInfo,
    selectedPerms,
    billingPeriod,
    planInfoForPrice,
    personal,
    address,
    requestError,
    billingType,
    segment,
    upgradeCalculation,
    setUpgradeCalculation,
  } = useUpgradeSheetContext();

  useEffect(() => {
    if (selectedPlan === 'FREE') return;
    let cancelled = false;
    getUpgradePreview(selectedPlan, billingPeriod, billingType, segment).then(
      (r) => {
        if (!cancelled && r.calculation) setUpgradeCalculation(r.calculation);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selectedPlan, billingPeriod, billingType, segment, setUpgradeCalculation]);

  return (
    <>
      <SheetSection>
        <div className="p-3.5 rounded-luxury bg-petroleum/5 border border-petroleum/10">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-luxury-wide text-petroleum/70 mb-1">
                Plano selecionado
              </p>
              <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide leading-none gap-2 flex">
                {selectedPlanInfo?.icon && (
                  <selectedPlanInfo.icon size={16} strokeWidth={1.5} />
                )}
                {selectedPlanInfo?.name ?? selectedPlan}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] text-petroleum/70">
                  Até {selectedPerms.maxPhotosPerGallery} arquivos por galeria ·
                  Até {selectedPerms.maxGalleriesHardCap} galerias ativas
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                    billingPeriod === 'monthly'
                      ? 'bg-slate-100 text-petroleum/60'
                      : 'bg-gold text-petroleum'
                  }`}
                >
                  {billingPeriod === 'monthly'
                    ? 'Mensal'
                    : billingPeriod === 'semiannual'
                      ? `Semestral · ${getPeriodPrice(planInfoForPrice, 'semiannual').discount}% OFF`
                      : `Anual · ${getPeriodPrice(planInfoForPrice, 'annual').discount}% OFF`}
                </span>
              </div>
              <p className="text-[13px] font-bold text-petroleum mt-1.5">
                R${' '}
                {
                  getPeriodPrice(planInfoForPrice, billingPeriod)
                    .effectiveMonthly
                }
                <span className="text-[10px] font-medium text-petroleum/90">
                  /mês
                </span>
                {billingPeriod !== 'monthly' && (
                  <span className="text-[10px] font-medium text-petroleum/90 ml-1">
                    · R$
                    {
                      getPeriodPrice(planInfoForPrice, billingPeriod).totalPrice
                    }{' '}
                    cobrado agora
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('plan')}
              className="text-[10px] font-semibold text-gold hover:underline shrink-0"
            >
              Alterar
            </button>
          </div>
        </div>
      </SheetSection>

      {/* Resumo de simulação: valor novo, crédito, total a pagar */}
      {upgradeCalculation?.type === 'upgrade' && (
        <SheetSection title="Resumo do pagamento">
          <div className="space-y-1.5 rounded-luxury border border-petroleum/10 bg-petroleum/5 p-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-petroleum/80">Valor do novo plano:</span>
              <span className="font-semibold text-petroleum">
                {formatBRL(upgradeCalculation.amount_original)}
              </span>
            </div>
            {upgradeCalculation.residual_credit > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Crédito do plano atual:</span>
                <span className="font-semibold">
                  - {formatBRL(upgradeCalculation.residual_credit)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-petroleum/10 pt-2 mt-2">
              <span className="font-bold text-petroleum">Total a pagar agora:</span>
              <span className="font-bold text-petroleum">
                {formatBRL(upgradeCalculation.amount_final)}
              </span>
            </div>
          </div>
        </SheetSection>
      )}

      <SheetSection title="Dados confirmados">
        <div className="space-y-0 divide-y divide-slate-100">
          {[
            {
              label: 'Nome',
              value: personal.fullName || '—',
              onEdit: () => setStep('personal'),
            },
            {
              label: 'CPF/CNPJ',
              value: personal.cpfCnpj,
              onEdit: () => setStep('personal'),
            },
            {
              label: 'WhatsApp',
              value: personal.whatsapp,
              onEdit: () => setStep('personal'),
            },
            {
              label: 'Endereço',
              value: `${address.street}, ${address.number}${address.complement ? ` – ${address.complement}` : ''}, ${address.neighborhood}, ${address.city}/${address.state} – ${address.cep}`,
              onEdit: () => setStep('personal'),
            },
          ].map(({ label, value, onEdit }) => (
            <div
              key={label}
              className="flex items-start justify-between gap-3 py-1.5"
            >
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
                  {label}
                </p>
                <p className="text-[11px] font-medium text-petroleum leading-snug mt-0.5">
                  {value}
                </p>
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="text-[10px] font-semibold text-gold hover:underline shrink-0 mt-1"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      </SheetSection>

      <SheetSection>
        <p className="text-[9px] text-slate-700 italic px-0.5">
          A cobrança aparece como <strong>SUAGALERIA</strong> na sua fatura.
          Direito de arrependimento de 7 dias (CDC).
        </p>
      </SheetSection>

      {requestError && (
        <div className="rounded-luxury bg-red-50 border border-red-200/60 px-3 py-2">
          <p className="text-[10px] font-medium text-red-700">{requestError}</p>
        </div>
      )}
    </>
  );
}
