'use client';

import React, { useMemo } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Zap,
  ChevronRight,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import {
  PERMISSIONS_BY_PLAN,
  PLANS_BY_SEGMENT,
  getPlanBenefits,
  getPeriodPrice,
  getNextPlanKey,
  type PlanKey,
  type PlanBenefitItem,
} from '@/core/config/plans';

const SEGMENT = 'PHOTOGRAPHER' as const;

interface UpgradeUpsellCardProps {
  currentPlanKey: PlanKey;
  onUpgrade: (nextPlanKey: PlanKey) => void;
}

export function UpgradeUpsellCard({
  currentPlanKey,
  onUpgrade,
}: UpgradeUpsellCardProps) {
  const nextPlanKey = getNextPlanKey(currentPlanKey);
  if (!nextPlanKey) return null;

  const nextPlanInfo = PLANS_BY_SEGMENT[SEGMENT][nextPlanKey];
  const nextPermissions = PERMISSIONS_BY_PLAN[nextPlanKey];
  const nextPlanBenefits: PlanBenefitItem[] = useMemo(
    () => getPlanBenefits(nextPermissions, { items: 'galerias' }),
    [nextPermissions],
  );
  const annualPrice = getPeriodPrice(nextPlanInfo, 'annual');
  const semestralPrice = getPeriodPrice(nextPlanInfo, 'semiannual');

  if (!nextPlanBenefits.length || !nextPlanInfo) return null;

  const previewBenefits = nextPlanBenefits.slice(0, 3);

  return (
    <div className="rounded-luxury border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles size={20} className="text-gold" />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-700">
              Próximo nível
            </p>
            <p className="text-[13px] font-semibold text-petroleum leading-tight">
              Plano {nextPlanInfo.name ?? nextPlanKey}
            </p>
          </div>
        </div>
        {nextPlanInfo.price > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[15px] font-semibold text-petroleum leading-none">
              R${nextPlanInfo.price}
              <span className="text-[9px] font-medium text-slate-700">
                /mês
              </span>
            </p>
            {annualPrice.discount > 0 && (
              <p className="text-[10px] text-emerald-600 font-semibold">
                −{annualPrice.discount}% no anual
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-700 mb-2">
          Por que fazer upgrade
        </p>
        <ul className="space-y-2">
          {previewBenefits.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2
                size={12}
                className="text-gold shrink-0 mt-0.5"
                strokeWidth={2}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-petroleum leading-tight">
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-500 leading-snug">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {(semestralPrice.discount > 0 || annualPrice.discount > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {semestralPrice.discount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                −{semestralPrice.discount}% semestral
              </span>
            )}
            {annualPrice.discount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                −{annualPrice.discount}% anual
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 space-y-2">
        <button
          type="button"
          onClick={() => onUpgrade(nextPlanKey)}
          className="btn-luxury-primary h-8 w-full"
        >
          <Zap size={12} strokeWidth={2.5} />
          Assinar Plano {nextPlanInfo.name ?? nextPlanKey}
          <ChevronRight size={12} />
        </button>
        <a
          href="/planos"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-petroleum/70 hover:text-petroleum font-semibold text-[9px] uppercase tracking-wider transition-colors border border-petroleum/20 rounded-lg hover:border-petroleum/40"
        >
          Comparar planos
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
