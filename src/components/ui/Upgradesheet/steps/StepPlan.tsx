'use client';

import React, { useEffect, useState } from 'react';
import { SheetSection } from '@/components/ui/Sheet';
import {
  planOrder,
  PLANS_BY_SEGMENT,
  PERMISSIONS_BY_PLAN,
  getPlanBenefits,
} from '@/core/config/plans';
import type { PlanKey } from '@/core/config/plans';
import { getUpgradePreview } from '@/core/services/asaas.service';
import type { UpgradePreviewResult } from '@/core/types/billing';
import { PlanCard } from '../PlanCard';
import { PLAN_ICONS } from '../constants';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';
import LoadingSpinner from '../../LoadingSpinner';
import { InfoTooltip } from '../../InfoTooltip';

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function StepPlan() {
  const {
    segment,
    planKey,
    selectedPlan,
    setSelectedPlan,
    expandedPlanKey,
    setExpandedPlanKey,
    suggestedPlanKey,
    terms,
    billingType,
    billingPeriod,
    isExempt,
    setHasPendingUpgrade,
    setUpgradeCalculation,
    setDowngradeBlockedMessage,
  } = useUpgradeSheetContext();

  const [upgradePreview, setUpgradePreview] =
    useState<UpgradePreviewResult | null>(null);
  /** Data de vencimento do plano atual (para tooltip em planos inferiores). Preenchida quando há cálculo de downgrade. */
  const [downgradeExpiresAt, setDowngradeExpiresAt] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (planKey === 'FREE') {
      setDowngradeExpiresAt(null);
      return;
    }
    const idx = planOrder.indexOf(planKey as PlanKey);
    if (idx <= 0) return;
    const firstLower = planOrder[idx - 1];
    getUpgradePreview(firstLower, billingPeriod, billingType, segment).then(
      (result) => {
        const c = result.calculation;
        if (c?.type === 'downgrade' && c.current_plan_expires_at)
          setDowngradeExpiresAt(c.current_plan_expires_at);
      },
    );
  }, [planKey, billingPeriod, billingType, segment]);

  useEffect(() => {
    if (planKey === 'FREE' || selectedPlan === 'FREE') {
      setUpgradePreview(null);
      setHasPendingUpgrade(false);
      setUpgradeCalculation(null);
      setDowngradeBlockedMessage(null);
      return;
    }
    let cancelled = false;
    // Sempre exibir o cálculo em base mensal no passo Plano; no StepBilling o valor é recalculado conforme o período selecionado.
    getUpgradePreview(selectedPlan, 'monthly', billingType, segment).then(
      (result) => {
        if (!cancelled) {
          setUpgradePreview(result);
          setHasPendingUpgrade(result.has_pending ?? false);
          const calc = result.calculation;
          setUpgradeCalculation(calc ?? null);
          // Só tratar como downgrade se o plano selecionado for realmente inferior ao atual (ordem dos planos)
          const selectedIdx = planOrder.indexOf(selectedPlan as PlanKey);
          const currentIdx = planOrder.indexOf(planKey as PlanKey);
          const isDowngradeByOrder =
            selectedIdx >= 0 && currentIdx >= 0 && selectedIdx < currentIdx;
          if (
            calc?.type === 'downgrade' &&
            calc.current_plan_expires_at &&
            isDowngradeByOrder
          ) {
            setDowngradeBlockedMessage(
              `Mudança para planos inferiores permitida apenas após o vencimento do plano atual em ${formatDate(calc.current_plan_expires_at)}.`,
            );
            setDowngradeExpiresAt(calc.current_plan_expires_at);
          } else {
            setDowngradeBlockedMessage(null);
            if (calc?.current_plan_expires_at && isDowngradeByOrder)
              setDowngradeExpiresAt(calc.current_plan_expires_at);
            else if (!isDowngradeByOrder) setDowngradeExpiresAt(null);
          }
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    selectedPlan,
    billingType,
    segment,
    planKey,
    setHasPendingUpgrade,
    setUpgradeCalculation,
    setDowngradeBlockedMessage,
  ]);

  const calc =
    upgradePreview?.success &&
    upgradePreview?.has_active_plan &&
    upgradePreview?.calculation;
  const planName =
    PLANS_BY_SEGMENT[segment]?.[selectedPlan]?.name ?? selectedPlan;

  // Downgrade real: plano selecionado é inferior ao atual (pela ordem dos planos)
  const selectedIdx = planOrder.indexOf(selectedPlan as PlanKey);
  const currentIdx = planOrder.indexOf(planKey as PlanKey);
  const isDowngradeByOrder =
    planKey !== 'FREE' &&
    selectedIdx >= 0 &&
    currentIdx >= 0 &&
    selectedIdx < currentIdx;

  // Exibir mensagem de downgrade só quando for realmente downgrade
  const showDowngradeBanner =
    calc && calc.type === 'downgrade' && isDowngradeByOrder;
  // Box de upgrade: quando a API diz upgrade OU quando pela ordem é upgrade (não é downgrade) e há crédito ou valor a pagar
  const showUpgradeBox =
    calc &&
    calc.type !== 'current_plan' &&
    !isDowngradeByOrder &&
    ((calc.residual_credit ?? 0) > 0 || (calc.amount_final ?? 0) >= 0);

  return (
    <SheetSection title="Escolha seu novo plano">
      {isExempt && selectedPlan === planKey && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 text-[11px] text-petroleum">
          <p className="font-medium text-petroleum">
            Você possui possui isenção neste plano.
          </p>
        </div>
      )}
      {upgradePreview?.has_pending && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
          <p className="font-medium">
            Você já possui uma solicitação de upgrade em processamento. Aguarde
            a confirmação do pagamento ou o cancelamento automático (até 24h)
            para assinar novamente.
          </p>
        </div>
      )}
      {showDowngradeBanner && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
          <p className="font-medium">
            Mudança para planos inferiores permitida apenas após o vencimento do
            plano atual em{' '}
            <span className="font-semibold text-petroleum">
              {formatDate(calc!.current_plan_expires_at ?? '')}
            </span>
            .
          </p>
        </div>
      )}
      {!calc && planKey !== 'FREE' && selectedPlan !== 'FREE' ? (
        <div className="py-4">
          <LoadingSpinner text="Calculando crédito para uso no upgrade..." />
        </div>
      ) : showUpgradeBox ? (
        <div
          className={`rounded-lg border px-3 py-2.5 text-[11px] ${
            calc!.is_free_upgrade
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-1"></div>
          {calc!.is_free_upgrade ? (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-bold text-emerald-600 uppercase text-[10px] tracking-wider">
                  Upgrade Gratuito
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  (Cálculo em base mensal)
                </span>
                <InfoTooltip
                  portal
                  size="3xl"
                  title="Cálculo de Crédito"
                  content="O valor é exibido em base mensal para comparação. No próximo passo, ao escolher o período (mensal, semestral ou anual), o saldo será aplicado e a data de renovação será ajustada."
                />
              </div>
              <p className="mb-1 font-medium">
                Crédito de{' '}
                <span className="font-semibold text-emerald-800">
                  {formatBRL(calc!.residual_credit ?? 0)}
                </span>{' '}
                (dias não utilizados do plano anterior).
              </p>
              <p className="font-medium">
                Seu crédito dá direito a uso até{' '}
                <span className="font-semibold">
                  {formatDate(calc!.new_expiry_date!)}
                </span>
                . Nenhum valor a pagar. A próxima cobrança será nessa data.
              </p>
            </>
          ) : (
            <>
              {(calc!.residual_credit ?? 0) > 0 && (
                <p className="mb-1 font-medium">
                  Crédito de{' '}
                  <span className="font-semibold text-petroleum">
                    {formatBRL(calc!.residual_credit!)}
                  </span>{' '}
                  referente aos dias não utilizados do plano anterior.
                </p>
              )}
              {(calc!.residual_credit ?? 0) > 0 &&
                (calc!.amount_final ?? 0) > 0 && (
                  <p className="font-medium">
                    Upgrade imediato: pague apenas a diferença de{' '}
                    <span className="font-semibold text-petroleum">
                      {formatBRL(calc!.amount_final!)}
                    </span>
                  </p>
                )}
              {(calc!.residual_credit ?? 0) <= 0 &&
                (calc!.amount_final ?? 0) > 0 && (
                  <p className="font-medium">
                    Valor a pagar:{' '}
                    <span className="font-semibold text-petroleum">
                      {formatBRL(calc!.amount_final!)}
                    </span>
                  </p>
                )}
            </>
          )}
        </div>
      ) : null}
      <div className="space-y-3">
        {planOrder
          .filter((p) => p !== 'FREE')
          .map((p) => {
            const info = PLANS_BY_SEGMENT[segment]?.[p];
            const perms = PERMISSIONS_BY_PLAN[p];
            const isCurr = p === (planKey as PlanKey);
            const isDowngrade =
              planKey !== 'FREE' &&
              planOrder.indexOf(p) < planOrder.indexOf(planKey as PlanKey);
            const disabled = isCurr || isDowngrade;
            const downgradeTooltip = isDowngrade
              ? downgradeExpiresAt
                ? `Mudança para planos inferiores permitida apenas após o vencimento do plano atual em ${formatDate(downgradeExpiresAt)}.`
                : 'Mudança para planos inferiores permitida apenas após o vencimento do plano atual.'
              : undefined;
            return (
              <PlanCard
                key={p}
                planKey={p}
                planName={info?.name ?? p}
                price={info?.price ?? 0}
                isCurrentPlan={isCurr}
                isSelected={selectedPlan === p}
                isSuggested={p === suggestedPlanKey}
                disabled={disabled}
                disabledTooltip={downgradeTooltip}
                onSelect={() => setSelectedPlan(p)}
                perms={perms}
                isExpanded={expandedPlanKey === p}
                onToggleExpand={() =>
                  setExpandedPlanKey((prev) => (prev === p ? null : p))
                }
                benefits={getPlanBenefits(perms, terms)}
                planIcon={PLAN_ICONS[p]}
              />
            );
          })}
      </div>
    </SheetSection>
  );
}
