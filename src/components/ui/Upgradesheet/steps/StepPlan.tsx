'use client';

import React from 'react';
import { SheetSection } from '@/components/ui/Sheet';
import { planOrder, PLANS_BY_SEGMENT, PERMISSIONS_BY_PLAN, getPlanBenefits } from '@/core/config/plans';
import type { PlanKey } from '@/core/config/plans';
import { PlanCard } from '../PlanCard';
import { PLAN_ICONS } from '../constants';
import { useUpgradeSheetContext } from '../UpgradeSheetContext';

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
  } = useUpgradeSheetContext();

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
      </div>
    </SheetSection>
  );
}
