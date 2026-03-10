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
  } = useUpgradeSheetContext();

  const [upgradePreview, setUpgradePreview] =
    useState<UpgradePreviewResult | null>(null);

  useEffect(() => {
    if (planKey === 'FREE' || selectedPlan === 'FREE') {
      setUpgradePreview(null);
      return;
    }
    let cancelled = false;
    getUpgradePreview(selectedPlan, billingPeriod, billingType, segment).then(
      (result) => {
        if (!cancelled) setUpgradePreview(result);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [selectedPlan, billingPeriod, billingType, segment, planKey]);

  const calc =
    upgradePreview?.success &&
    upgradePreview?.has_active_plan &&
    upgradePreview?.calculation;
  const planName =
    PLANS_BY_SEGMENT[segment]?.[selectedPlan]?.name ?? selectedPlan;

  return (
    <SheetSection title="Escolha seu novo plano">
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
                disabled={false}
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

        {isExempt && selectedPlan === planKey && (
          <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 text-[11px] text-petroleum">
            <p className="font-medium text-petroleum">
              Você possui possui isenção neste plano.
            </p>
          </div>
        )}
        {calc && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700">
            {calc.type === 'current_plan' ? (
              <p className="font-medium text-amber-800">
                Este já é seu plano atual. Não é possível assinar novamente o
                mesmo plano e período.
              </p>
            ) : calc.type === 'upgrade' && calc.amount_final >= 0 ? (
              <p className="font-medium">
                Upgrade imediato: pague apenas a diferença de{' '}
                <span className="font-semibold text-petroleum">
                  {formatBRL(calc.amount_final)}
                </span>
              </p>
            ) : calc.type === 'downgrade' && calc.downgrade_effective_at ? (
              <p className="font-medium">
                Sua mudança para o plano{' '}
                <span className="font-semibold">{planName}</span> será efetivada
                em{' '}
                <span className="font-semibold text-petroleum">
                  {formatDate(calc.downgrade_effective_at)}
                </span>
                .
              </p>
            ) : null}
          </div>
        )}
      </div>
    </SheetSection>
  );
}
