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

interface PlanGuardProps {
  feature: keyof PlanPermissions;
  children: React.ReactNode;
  label?: string;
  scenarioType?: 'limit' | 'feature'; // Optional prop to specify scenario type
  forceShowLock?: boolean;
}

export function PlanGuard({
  feature,
  children,
  label,
  scenarioType = 'feature',
  forceShowLock = false,
}: PlanGuardProps) {
  const { planKey, permissions, segment } = usePlan();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // 1. Verificação de Acesso
  const hasAccess = (() => {
    if (forceShowLock) return false; // Se o limite estourou, bloqueia independente da feature
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

  return (
    <>
      <div
        onClick={handleLockedClick}
        data-testid="plan-guard-overlay"
        className="relative group cursor-pointer overflow-hidden rounded-luxury border border-transparent hover:border-gold/20 transition-all duration-500"
      >
        {/* Badge Discreto de Plano no Canto Superior Direito */}
        {requiredPlan && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2 py-1 bg-petroleum/80 backdrop-blur-md rounded-full border border-white/10 shadow-lg scale-90 group-hover:scale-100 transition-all duration-500">
            <Sparkles size={8} className="text-gold animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] text-gold/90">
              {requiredPlan}
            </span>
          </div>
        )}

        {/* Camada Visual Desabilitada */}
        <div className="opacity-25 blur-[2px] pointer-events-none select-none grayscale transition-all duration-700">
          {children}
        </div>

        {/* Overlay Editorial de Bloqueio */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-petroleum/10 backdrop-blur-[1px] group-hover:bg-petroleum/20 transition-all duration-500">
          <div className="bg-white p-2.5 rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500 border border-gold/20">
            <Lock size={14} className="text-gold" strokeWidth={3} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white drop-shadow-md">
            {label ? label : 'Premium'}
          </span>
        </div>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName={label || 'Recurso Premium'}
        featureKey={feature}
        scenarioType={scenarioType}
      />
    </>
  );
}
