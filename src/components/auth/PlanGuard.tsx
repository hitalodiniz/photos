'use client';

import React, { useState, useMemo } from 'react';
import {
  PlanPermissions,
  PlanKey,
  findNextPlanWithFeature,
  FEATURE_DESCRIPTIONS,
} from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { Lock, Sparkles } from 'lucide-react';
import UpgradeModal from '../ui/UpgradeModal';
import { useSegment } from '@/hooks/useSegment';

interface PlanGuardProps {
  feature: keyof PlanPermissions;
  children: React.ReactNode;
  label?: string;
  scenarioType?: 'limit' | 'feature';
  forceShowLock?: boolean;
  variant?: 'default' | 'mini';
}

export function PlanGuard({
  feature,
  children,
  label,
  scenarioType = 'feature',
  forceShowLock = false,
  variant = 'default',
}: PlanGuardProps) {
  const { planKey, permissions } = usePlan();
  const { terms, segment } = useSegment();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const featureInfo = FEATURE_DESCRIPTIONS[feature];
  const displayLabel = label || featureInfo?.label || 'Recurso Premium';
  const displayDescription =
    featureInfo?.description || 'Faça upgrade para liberar este recurso.';

  const hasAccess = (() => {
    if (forceShowLock) return false;
    const val = permissions[feature];
    if (typeof val === 'number') return val > 0;
    if (typeof val === 'boolean') return val === true;
    if (val === 'unlimited') return true;
    if (['default', 'basic', 'minimal'].includes(val as string)) return false;
    return !!val;
  })();

  const requiredPlan = useMemo(() => {
    if (hasAccess) return null;
    return findNextPlanWithFeature(planKey as PlanKey, feature, segment);
  }, [hasAccess, planKey, feature, segment]);

  if (hasAccess) return <>{children}</>;

  const isMini = variant === 'mini';

  const upgradeMessage = requiredPlan
    ? `Disponível no Plano ${requiredPlan} ou superior`
    : 'Disponível em planos superiores';

  return (
    <>
      {/* 🎯 Ajuste: Se for mini, removemos padding, bordas e fundo do container */}
      <div
        className={`relative overflow-hidden transition-all duration-500 ${
          isMini
            ? 'rounded-md' // No mini, apenas o arredondamento básico do input
            : 'rounded-luxury border border-gold/20 p-4 bg-slate-50/10'
        }`}
      >
        {/* 2. CAMADA DE CONTEÚDO */}
        <div className="opacity-40 grayscale-[0.4] pointer-events-none select-none z-0">
          {children}
        </div>

        {/* 3. ESCUDO DE INTERCEPTAÇÃO SUPREMO */}
        <div
          data-testid="plan-guard-overlay"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsUpgradeModalOpen(true);
          }}
          className="absolute inset-0 z-[1001] cursor-pointer bg-transparent"
        />

        {/* 4. UI DE BLOQUEIO */}
        <div className="absolute inset-0 z-[1002] pointer-events-none flex items-center justify-center">
          {isMini ? (
            // Mini Lock: Apenas o ícone com um leve brilho central
            <div className="bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-gold/30">
              <Lock size={10} className="text-gold" strokeWidth={3} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-2 rounded-full shadow-2xl border border-gold/30 flex items-center justify-center shrink-0">
                <Lock size={14} className="text-gold" strokeWidth={3} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-petroleum leading-tight drop-shadow-sm">
                  {displayLabel}
                </span>
                <span className="text-[10px] font-semibold text-gold mt-1 drop-shadow-sm text-center">
                  {upgradeMessage}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 5. BADGE DE PLANO: Menor e mais discreto no Mini */}
        {requiredPlan && (
          <div
            className={`absolute z-[1003] flex items-center bg-petroleum rounded-full border border-gold/30 shadow-lg pointer-events-none
            ${isMini ? 'top-1 right-1 px-1 py-0.5' : 'top-3 right-3 px-2.5 py-1'}`}
          >
            <Sparkles
              size={isMini ? 6 : 10}
              className="text-gold animate-pulse"
            />
            {!isMini && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gold ml-1">
                {requiredPlan}
              </span>
            )}
          </div>
        )}
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
