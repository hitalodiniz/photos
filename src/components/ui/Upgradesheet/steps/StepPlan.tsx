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

  useEffect(() => {
    if (planKey === 'FREE' || selectedPlan === 'FREE') {
      setUpgradePreview(null);
      setHasPendingUpgrade(false);
      setUpgradeCalculation(null);
      setDowngradeBlockedMessage(null);
      return;
    }
    let cancelled = false;
    getUpgradePreview(selectedPlan, billingPeriod, billingType, segment).then(
      (result) => {
        if (!cancelled) {
          setUpgradePreview(result);
          setHasPendingUpgrade(result.has_pending ?? false);
          const calc = result.calculation;
          setUpgradeCalculation(calc ?? null);
          if (calc?.type === 'downgrade' && calc.current_plan_expires_at) {
            setDowngradeBlockedMessage(
              `Mudança para planos inferiores permitida apenas após o vencimento do plano atual em ${formatDate(calc.current_plan_expires_at)}.`,
            );
          } else {
            setDowngradeBlockedMessage(null);
          }
        }
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
      {calc && calc.type === 'downgrade' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
          <p className="font-medium">
            Mudança para planos inferiores permitida apenas após o vencimento do
            plano atual em{' '}
            <span className="font-semibold text-petroleum">
              {formatDate(calc.current_plan_expires_at ?? '')}
            </span>
            .
          </p>
        </div>
      )}
      {calc && calc.type !== 'downgrade' && calc.type !== 'current_plan' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700">
          {calc.type === 'upgrade' && calc.amount_final >= 0 && (
            <p className="font-medium">
              Upgrade imediato: pague apenas a diferença de{' '}
              <span className="font-semibold text-petroleum">
                {formatBRL(calc.amount_final)}
              </span>
            </p>
          )}
        </div>
      )}
      <div className="space-y-3">
        {planOrder
          .filter((p) => p !== 'FREE')
          .map((p) => {
            const info = PLANS_BY_SEGMENT[segment]?.[p];
            const perms = PERMISSIONS_BY_PLAN[p];
            const isCurr = p === (planKey as PlanKey);
            return (
              <PlanCard
                key={p}
                planKey={p}
                planName={info?.name ?? p}
                price={info?.price ?? 0}
                isCurrentPlan={isCurr}
                isSelected={selectedPlan === p}
                isSuggested={p === suggestedPlanKey}
                disabled={isCurr}
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
