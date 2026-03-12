'use client';

import React, { useEffect } from 'react';
import { SheetSection } from '@/components/ui/Sheet';
import { getPeriodPrice } from '@/core/config/plans';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { getUpgradePreview } from '@/core/services/asaas.service';
import { Banknote, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

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

  const { showToast, ToastElement } = useToast();

  useEffect(() => {
    if (requestError) showToast(requestError, 'error');
  }, [requestError]);

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
  }, [
    selectedPlan,
    billingPeriod,
    billingType,
    segment,
    setUpgradeCalculation,
  ]);

  const nextBillingDateFormatted = upgradeCalculation?.new_expiry_date
    ? new Date(upgradeCalculation.new_expiry_date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <>
      {/* CARD 1: Plano Selecionado (Branco/Minimalista) */}
      <SheetSection>
        <div className="relative p-3.5 rounded-luxury border border-slate-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setStep('plan')}
            className="absolute top-3.5 right-3.5 text-[10px] font-semibold text-gold hover:underline shrink-0"
          >
            Alterar
          </button>

          <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/70 mb-1">
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
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-slate-100 text-petroleum/60 rounded">
              {billingPeriod === 'monthly'
                ? 'Mensal'
                : billingPeriod === 'semiannual'
                  ? 'Semestral'
                  : 'Anual'}
            </span>
            <span className="text-[11px] text-petroleum/70">
              Até {selectedPerms.maxPhotosPerGallery} fotos e vídeos por galeria
              · Até {selectedPerms.maxGalleriesHardCap} galerias
            </span>
          </div>
        </div>
      </SheetSection>

      {/* CARD 3: Dados de Faturamento */}
      <SheetSection title="Dados de faturamento">
        <div className="relative p-3.5 rounded-luxury border border-slate-100 bg-white shadow-sm">
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

        {/* CARD 4: Endereço */}
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

      {/* CARD 2: Resumo Financeiro (Branco/Minimalista) */}
      {upgradeCalculation?.type === 'upgrade' && (
        <SheetSection title="Resumo do pagamento">
          <div className="p-3.5 rounded-luxury border border-slate-100 bg-white shadow-sm space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-petroleum/70 font-medium">
                Valor do novo plano:
              </span>
              <span className="text-petroleum">
                {formatBRL(upgradeCalculation?.amount_original ?? 0)}
              </span>
            </div>

            {upgradeCalculation?.residual_credit > 0 && (
              <div className="flex justify-between text-[11px] text-emerald-600">
                <span className="font-medium">Crédito do plano atual:</span>
                <span className="font-bold">
                  - {formatBRL(upgradeCalculation.residual_credit)}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-slate-100 pt-2 mt-1">
              <span className="text-[12px] font-bold text-petroleum">
                Total a pagar agora:
              </span>
              <span className="text-[13px] font-bold text-petroleum">
                {formatBRL(upgradeCalculation?.amount_final ?? 0)}
              </span>
            </div>

            {nextBillingDateFormatted && (
              <div className="mt-3 p-2 rounded bg-slate-50 border border-slate-100 flex items-start gap-2 text-petroleum/80">
                {billingType === 'CREDIT_CARD' ? (
                  <CreditCard size={12} className="mt-0.5" />
                ) : (
                  <Banknote size={12} className="mt-0.5" />
                )}
                <p className="text-[11px] leading-tight font-medium">
                  Próxima fatura em <strong>{nextBillingDateFormatted}</strong>.
                  {billingType === 'CREDIT_CARD'
                    ? ' Cobrança automática no cartão.'
                    : ' Pagamento manual via Boleto/PIX.'}
                </p>
              </div>
            )}
          </div>
        </SheetSection>
      )}

      {ToastElement}
    </>
  );
}
