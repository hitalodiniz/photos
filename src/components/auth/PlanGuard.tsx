'use client';

import React, { useState, useMemo } from 'react';
import {
  PlanPermissions,
  PlanKey,
  findNextPlanWithFeature,
} from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { Lock, Sparkles } from 'lucide-react';
import UpgradeModal from '../ui/UpgradeModal';
import { useSegment } from '@/hooks/useSegment'; // 🎯 Import do Hook

interface PlanGuardProps {
  feature: keyof PlanPermissions;
  children: React.ReactNode;
  label?: string;
  scenarioType?: 'limit' | 'feature';
  forceShowLock?: boolean;
}

export function PlanGuard({
  feature,
  children,
  label,
  scenarioType = 'feature',
  forceShowLock = false,
}: PlanGuardProps) {
  const { planKey, permissions } = usePlan();
  const { terms, segment } = useSegment(); // 🎯 Obtendo termos do segmento
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // 1. Verificação de Acesso
  const hasAccess = (() => {
    if (forceShowLock) return false;
    const val = permissions[feature];
    if (typeof val === 'number') return val > 0;
    if (typeof val === 'boolean') return val === true;
    if (val === 'unlimited') return true;
    if (['default', 'basic', 'minimal'].includes(val as string)) return false;
    return !!val;
  })();

  // 2. Identificação do Plano Necessário para o Badge
  const requiredPlan = useMemo(() => {
    if (hasAccess) return null;
    return findNextPlanWithFeature(planKey as PlanKey, feature, segment);
  }, [hasAccess, planKey, feature, segment]);

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUpgradeModalOpen(true);
  };

  if (hasAccess) return <>{children}</>;

  // 🎯 Parametrização do Label padrão baseada no segmento
  const defaultLabel =
    scenarioType === 'limit'
      ? `Limite de ${terms.items} atingido`
      : 'Recurso Premium';

  return (
    <>
      <div
        onClick={handleLockedClick}
        data-testid="plan-guard-overlay"
        className="relative group cursor-pointer overflow-hidden rounded-luxury border border-transparent hover:border-gold/20 transition-all duration-500"
      >
        {/* Badge de Plano */}
        {requiredPlan && (
          <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 px-2 py-0.5 bg-petroleum/90 backdrop-blur-md rounded-full border border-white/10 shadow-md">
            <Sparkles size={8} className="text-gold animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-gold">
              {requiredPlan}
            </span>
          </div>
        )}

        {/* Camada Visual Desabilitada */}
        <div className="opacity-10 pointer-events-none select-none grayscale transition-all duration-700">
          {children}
        </div>

        {/* Overlay Editorial de Bloqueio */}
        <div className="absolute inset-0 z-10 flex items-center px-3 bg-petroleum/5 group-hover:bg-petroleum/10 transition-all duration-500">
          <div className="flex items-center gap-3 w-full">
            <div className="bg-white p-2 rounded-full shadow-xl border border-gold/20 flex items-center justify-center shrink-0 translate-y-[1px]">
              <Lock size={12} className="text-gold" strokeWidth={3} />
            </div>

            <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-petroleum drop-shadow-sm truncate pr-12">
              {label ? label : defaultLabel}
            </span>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName={label || defaultLabel}
        featureKey={feature}
        scenarioType={scenarioType}
      />
    </>
  );
}
