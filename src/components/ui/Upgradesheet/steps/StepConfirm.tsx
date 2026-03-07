'use client';

import React from 'react';
import { SheetSection } from '@/components/ui/Sheet';
import { getPeriodPrice } from '@/core/config/plans';
import { storageLabel } from '../utils';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';

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
    acceptedTerms,
    setAcceptedTerms,
    setShowTermsModal,
    requestError,
  } = useUpgradeSheetContext();

  return (
    <>
      <SheetSection>
        <div className="p-3.5 rounded-luxury bg-petroleum/5 border border-petroleum/10">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-luxury-wide text-petroleum/50 mb-1">
                Plano selecionado
              </p>
              <p className="text-[15px] font-bold text-petroleum uppercase tracking-wide leading-none">
                {selectedPlanInfo?.name ?? selectedPlan}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] text-petroleum/50">
                  {storageLabel(selectedPerms.storageGB)} ·{' '}
                  {selectedPerms.maxGalleries} galerias
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
                R$
                {
                  getPeriodPrice(planInfoForPrice, billingPeriod)
                    .effectiveMonthly
                }
                <span className="text-[9px] font-medium text-petroleum/90">
                  /mês
                </span>
                {billingPeriod !== 'monthly' && (
                  <span className="text-[9px] font-medium text-petroleum/90 ml-1">
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
              className="text-[9px] font-semibold text-gold hover:underline shrink-0"
            >
              Alterar
            </button>
          </div>
        </div>
      </SheetSection>

      <SheetSection title="Dados confirmados">
        <div className="space-y-0 divide-y divide-slate-100">
          {[
            {
              label: 'WhatsApp',
              value: personal.whatsapp,
              onEdit: () => setStep('personal'),
            },
            {
              label: 'CPF/CNPJ',
              value: personal.cpfCnpj,
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
              className="flex items-start justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
                  {label}
                </p>
                <p className="text-[11px] font-semibold text-petroleum leading-snug mt-0.5">
                  {value}
                </p>
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="text-[9px] font-semibold text-gold hover:underline shrink-0 mt-1"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      </SheetSection>

      <SheetSection>
        <div
          className={`p-3 rounded-luxury border transition-all ${
            acceptedTerms
              ? 'bg-emerald-50/40 border-emerald-200/60'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="terms-upgrade"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gold focus:ring-gold cursor-pointer shrink-0"
            />
            <span className="text-[10px] leading-relaxed text-petroleum/60 font-medium">
              Li e concordo com os{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-gold font-bold hover:underline"
              >
                Termos de Uso
              </button>{' '}
              e estou ciente de que os arquivos são armazenados no meu Google
              Drive™ e que o plano possui limites de processamento.
            </span>
          </label>
        </div>
        <p className="text-[9px] text-slate-400 italic px-0.5 pt-2">
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
