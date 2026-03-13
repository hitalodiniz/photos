// components/ui/PlanGateScreen.tsx
'use client';

import { useState } from 'react';
import {
  Lock,
  Sparkles,
  TrendingUp,
  Users,
  Bell,
  BarChart2,
  ArrowRight,
} from 'lucide-react';
import { UpgradeSheet } from '@/components/ui/Upgradesheet';
import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';
import {
  findNextPlanWithFeature,
  FEATURE_DESCRIPTIONS,
  PlanKey,
  PlanPermissions,
} from '@/core/config/plans';

interface StatTeaser {
  icon: React.ElementType;
  label: string;
  value: number | string;
  hint?: string;
}

interface PlanGateScreenProps {
  feature: keyof PlanPermissions;
  title: string;
  description: string;
  teasers: StatTeaser[];
  scenarioType?: 'limit' | 'feature';
}

export function PlanGateScreen({
  feature,
  title,
  description,
  teasers,
  scenarioType = 'feature',
}: PlanGateScreenProps) {
  const { planKey } = usePlan();
  const { segment } = useSegment();
  const [isUpgradeSheetOpen, setIsUpgradeSheetOpen] = useState(false);

  const featureInfo = FEATURE_DESCRIPTIONS[feature];
  const displayLabel = featureInfo?.label || title;
  const displayDescription = featureInfo?.description || description;

  const requiredPlan = findNextPlanWithFeature(
    planKey as PlanKey,
    feature,
    segment,
  );

  return (
    <>
      <div className="flex-1 flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-lg w-full">
          {/* Card principal — rounded-luxury como no UpgradeModal */}
          <div className="bg-white rounded-luxury border border-gold/20 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-petroleum px-8 py-6 flex items-center gap-4">
              {/* Ícone de cadeado — mesmo estilo do UpgradeModal (bg-gold, shadow) */}
              <div className="w-10 h-10 rounded-luxury flex items-center justify-center shrink-0 bg-gold text-petroleum shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                <Lock size={18} strokeWidth={2.5} />
              </div>
              <div>
                {/* Label acima do título — tracking-luxury-wide como no UpgradeModal */}
                <p className="text-[9px] font-semibold text-white/80 uppercase tracking-luxury-wide mb-0.5">
                  Recurso Extra
                </p>
                <h2 className="text-lg font-semibold text-white leading-tight">
                  {title}
                </h2>
              </div>
              {requiredPlan && (
                /* Badge do plano — gap-2 p-2 rounded-luxury border border-gold/20 bg-gold/5
                   como o chip de feature no UpgradeModal */
                <div className="ml-auto flex items-center gap-1.5 bg-gold/5 border border-gold/20 rounded-luxury px-3 py-1.5 shrink-0">
                  <Sparkles size={10} className="text-gold animate-pulse" />
                  <span className="text-[10px] font-bold text-gold uppercase tracking-luxury-wide">
                    Plano {requiredPlan}
                  </span>
                </div>
              )}
            </div>

            {/* Teasers — dados reais borrados */}
            {teasers.length > 0 && (
              <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
                {/* Label da seção — tracking-luxury-wide como no UpgradeModal */}
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-luxury-wide mb-3">
                  Dados aguardando você
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {teasers.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <div
                        key={i}
                        className="bg-white rounded-luxury border border-slate-200 px-4 py-3 flex items-center gap-3 relative overflow-hidden"
                      >
                        {/* Ícone do teaser — mesmo p-2 rounded-luxury bg-gold/5 do UpgradeModal */}
                        <div className="p-2 rounded-luxury bg-gold/5 border border-gold/20 shrink-0">
                          <Icon size={14} className="text-gold" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-semisemibold text-slate-400 uppercase tracking-luxury-wide leading-none mb-1">
                            {t.label}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl font-black text-petroleum blur-[5px] select-none">
                              {t.value}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium leading-tight">
                              {t.hint || 'registros'}
                            </span>
                          </div>
                        </div>
                        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-700 italic mt-3 text-center">
                  Faça upgrade para desbloquear seus dados reais
                </p>
              </div>
            )}

            {/* Descrição + CTA */}
            <div className="px-8 py-5 space-y-3">
              {/* Descrição principal — border-l-2 border-gold/40 pl-3 bg-slate-50/50
                  idêntico ao bloco de description do UpgradeModal */}
              <p className="text-[14px] text-petroleum font-semisemibold leading-relaxed border-l-2 border-gold/40 pl-3 py-0.5 bg-slate-50/50">
                {description}
              </p>

              {/* Texto secundário — text-[13px] text-petroleum/80 font-medium como no UpgradeModal */}
              {requiredPlan && (
                <p className="text-[13px] text-petroleum/80 font-medium leading-relaxed">
                  Disponível a partir do Plano{' '}
                  <span className="font-extrasemibold text-petroleum">
                    {requiredPlan}
                  </span>
                  .
                </p>
              )}

              {/* CTA — btn-luxury-primary: abre UpgradeSheet sem submit/refresh */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsUpgradeSheetOpen(true);
                }}
                className="btn-luxury-primary w-full mt-2"
              >
                <Sparkles size={14} className="text-gold" />
                Ver planos e fazer upgrade
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <UpgradeSheet
        isOpen={isUpgradeSheetOpen}
        onClose={() => setIsUpgradeSheetOpen(false)}
        featureName={displayLabel}
        featureKey={feature}
        initialPlanKey={requiredPlan as PlanKey}
      />
    </>
  );
}
