'use client';

import React, { useEffect } from 'react';
import { SheetSection } from '@/components/ui/Sheet';
import { getPeriodPrice } from '@/core/config/plans';
import { storageLabel } from '../utils';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import { getUpgradePreview } from '@/core/services/asaas.service';
import { ShieldCheck, PencilLine, Banknote, CreditCard } from 'lucide-react';
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
      {/* CARD 1: Plano Selecionado (Linha Separada) */}
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
                      ? 'Semestral'
                      : 'Anual'}
                </span>
              </div>
              <p className="text-[13px] font-bold text-petroleum mt-1.5">
                R${' '}
                {
                  getPeriodPrice(planInfoForPrice, billingPeriod)
                    .effectiveMonthly
                }
                <span className="text-[10px] font-medium text-petroleum/90">
                  {' '}
                  /mês
                </span>
                {billingPeriod !== 'monthly' && (
                  <span className="text-[10px] font-medium text-petroleum/90 ml-1">
                    · R${' '}
                    {getPeriodPrice(planInfoForPrice, billingPeriod).totalPrice}{' '}
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

      {/* CARD 2: Resumo Financeiro (Linha Separada) */}
      {upgradeCalculation?.type === 'upgrade' && (
        <SheetSection title="Resumo do pagamento">
          <div className="space-y-2 rounded-luxury border border-petroleum/10 bg-petroleum/5 p-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-petroleum/80">Valor do novo plano:</span>
              <span className="font-semibold text-petroleum">
                {formatBRL(upgradeCalculation?.amount_original ?? 0)}
              </span>
            </div>

            {upgradeCalculation?.residual_credit > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Crédito do plano atual:</span>
                <span className="font-semibold">
                  - {formatBRL(upgradeCalculation.residual_credit)}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-petroleum/10 pt-2 mt-1">
              <span className="font-bold text-petroleum">
                Total a pagar agora:
              </span>
              <span className="font-bold text-petroleum">
                {formatBRL(upgradeCalculation?.amount_final ?? 0)}
              </span>
            </div>

            {/* INFORMAÇÃO DA PRÓXIMA FATURA - IMPORTANTE */}
            {nextBillingDateFormatted && (
              <div className="mt-3 pt-3 border-t border-dashed border-petroleum/10 flex items-start gap-2 text-petroleum">
                {billingType === 'CREDIT_CARD' ? (
                  <CreditCard size={12} className="mt-0.5" />
                ) : (
                  <Banknote size={12} className="mt-0.5" />
                )}
                <p className="text-[10px] leading-snug">
                  Sua próxima fatura será em{' '}
                  <strong>{nextBillingDateFormatted}</strong>.
                  {billingType === 'CREDIT_CARD'
                    ? ' A cobrança será efetuada automaticamente no seu cartão.'
                    : ' O boleto/PIX deverá ser pago manualmente para manter o acesso.'}
                </p>
              </div>
            )}
          </div>
        </SheetSection>
      )}

      {/* CARD 3: Dados Pessoais (Nome, CPF, WhatsApp) */}
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
              <p className="text-[11px] font-medium text-petroleum leading-snug mt-0.5">
                {personal.fullName || '—'}
              </p>
            </div>
            <div className="sm:col-span-3">
              <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
                CPF/CNPJ
              </p>
              <p className="text-[11px] font-medium text-petroleum leading-snug mt-0.5">
                {personal.cpfCnpj}
              </p>
            </div>
            <div className="sm:col-span-3">
              <p className="text-[9px] font-bold uppercase tracking-luxury-wide text-petroleum/90">
                WhatsApp
              </p>
              <p className="text-[11px] font-medium text-petroleum leading-snug mt-0.5">
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
          <p className="text-[11px] font-medium text-petroleum leading-snug mt-0.5">
            {address.street}, {address.number}
            {address.complement ? ` – ${address.complement}` : ''},{' '}
            {address.neighborhood}, {address.city}/{address.state} –{' '}
            {address.cep}
          </p>
        </div>
      </SheetSection>

      {ToastElement}
    </>
  );
}
