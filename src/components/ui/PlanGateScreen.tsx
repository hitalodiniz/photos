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
import UpgradeModal from './UpgradeModal';
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
  hint?: string; // ex: "registros aguardando você"
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
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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
          {/* Card principal */}
          <div className="bg-white rounded-2xl border border-gold/20 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-petroleum px-8 py-6 flex items-center gap-4">
              <div className="p-3 bg-gold/20 rounded-xl shrink-0">
                <Lock size={22} className="text-gold" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">
                  Recurso Extra
                </p>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {title}
                </h2>
              </div>
              {requiredPlan && (
                <div className="ml-auto flex items-center gap-1.5 bg-gold/20 border border-gold/30 rounded-full px-3 py-1 shrink-0">
                  <Sparkles size={10} className="text-gold animate-pulse" />
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                    Plano {requiredPlan}
                  </span>
                </div>
              )}
            </div>

            {/* Teasers — dados reais borrados */}
            {teasers.length > 0 && (
              <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Dados aguardando você
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {teasers.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <div
                        key={i}
                        className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 relative overflow-hidden"
                      >
                        <div className="p-2 bg-gold/10 rounded-lg shrink-0">
                          <Icon size={14} className="text-gold" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-1">
                            {t.label}
                          </p>
                          {/* Valor borrado mas presente — gera curiosidade */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl font-black text-petroleum blur-[5px] select-none">
                              {t.value}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium leading-tight">
                              {t.hint || 'registros'}
                            </span>
                          </div>
                        </div>
                        {/* Overlay sutil */}
                        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 italic mt-3 text-center">
                  Faça upgrade para desbloquear seus dados reais
                </p>
              </div>
            )}

            {/* Descrição */}
            <div className="px-8 py-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                {description}
              </p>

              {/* CTA */}
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-petroleum hover:bg-petroleum/90 text-white font-bold text-[12px] uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg"
              >
                <Sparkles size={14} className="text-gold" />
                Ver planos e fazer upgrade
                <ArrowRight size={14} />
              </button>

              {requiredPlan && (
                <p className="text-[10px] text-center text-slate-400 mt-3">
                  Disponível a partir do Plano{' '}
                  <span className="font-bold text-petroleum">
                    {requiredPlan}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName={displayLabel}
        description={displayDescription}
        featureKey={feature}
        scenarioType={scenarioType}
      />
    </>
  );
}
