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
import { InfoTooltip } from '../ui/InfoTooltip';

interface PlanGuardProps {
  feature: keyof PlanPermissions;
  children: React.ReactNode;
  label?: string;
  infoExtra?: string;
  scenarioType?: 'limit' | 'feature';
  forceShowLock?: boolean;
  variant?: 'default' | 'mini';
}

/**
 * 🛡️ Determina se o plano atual tem acesso ao feature.
 *
 * Trata 3 categorias de feature:
 *  - boolean / number       → lógica simples
 *  - hierarchical strings   → requer mapeamento explícito (ver HIERARCHY_MAP)
 *  - qualquer outro valor   → truthy/falsy
 *
 * IMPORTANTE: Features hierárquicas (profileLevel, customizationLevel,
 * privacyLevel, socialDisplayLevel, tagSelectionMode) nunca retornam `false`
 * diretamente — o valor mínimo delas é uma string como 'basic' ou 'default'.
 * Sem este mapa, o PlanGuard nunca bloquearia essas features.
 */

// Planos que possuem o nível MÍNIMO de cada feature hierárquica.
// Se o plano atual for o mínimo (FREE), hasAccess = false para bloqueá-lo.
// Ajuste conforme a regra de negócio de cada feature.
const HIERARCHY_ACCESS: Partial<
  Record<keyof PlanPermissions, (val: any) => boolean>
> = {
  // 'basic' é o mínimo → bloqueia. 'standard' ou acima → libera.
  profileLevel: (val) => val !== 'basic',

  // 'default' é o mínimo → bloqueia. 'colors' ou 'full' → libera.
  customizationLevel: (val) => val !== 'default',

  // 'public' é o mínimo → bloqueia (não permite senha/expiração). 'private' ou acima → libera.
  privacyLevel: (val) => val !== 'public',

  // 'minimal' é o mínimo → bloqueia.
  socialDisplayLevel: (val) => val !== 'minimal',

  // 'manual' é o mínimo → bloqueia.
  tagSelectionMode: (val) => val !== 'manual',
};

function resolveAccess(
  feature: keyof PlanPermissions,
  permissions: PlanPermissions,
  forceShowLock: boolean,
): boolean {
  if (forceShowLock) return false;

  const val = permissions[feature];

  // Verifica se é uma feature hierárquica com mapeamento definido
  const hierarchyChecker = HIERARCHY_ACCESS[feature];
  if (hierarchyChecker) return hierarchyChecker(val);

  // Features numéricas: tem acesso se o limite for > 0
  if (typeof val === 'number') return val > 0;

  // Features booleanas
  if (typeof val === 'boolean') return val;

  // Strings especiais
  if (val === 'unlimited') return true;

  // Fallback: qualquer valor truthy
  return !!val;
}

export function PlanGuard({
  feature,
  children,
  label,
  infoExtra,
  scenarioType = 'feature',
  forceShowLock = false,
  variant = 'default',
}: PlanGuardProps) {
  const { planKey, permissions } = usePlan();
  const { segment } = useSegment();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const featureInfo = FEATURE_DESCRIPTIONS[feature];
  const displayLabel = label || featureInfo?.label || 'Recurso Premium';
  const displayDescription =
    featureInfo?.description || 'Faça upgrade para liberar este recurso.';

  const hasAccess = resolveAccess(feature, permissions, forceShowLock);

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
      <div
        className={`relative transition-all duration-500 ${
          isMini
            ? 'rounded-md'
            : 'rounded-luxury border border-gold/20 p-4 bg-slate-50/10'
        }`}
      >
        {/* 1. CAMADA DE CONTEÚDO (BLOQUEADO) */}
        <div className="opacity-40 grayscale-[0.4] pointer-events-none select-none z-0 overflow-hidden">
          {children}
        </div>

        {/* 2. ESCUDO DE INTERCEPTAÇÃO SUPREMO */}
        <div
          data-testid="plan-guard-overlay"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsUpgradeModalOpen(true);
          }}
          className="absolute inset-0 z-[1001] cursor-pointer bg-transparent"
        />

        {/* 3. UI DE BLOQUEIO */}
        <div className="absolute inset-0 z-[1002] pointer-events-none flex items-center justify-center">
          {isMini ? (
            <div className="flex items-center gap-2">
              <div className="bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-gold/30">
                <Lock size={10} className="text-gold" strokeWidth={3} />
              </div>
              {infoExtra && (
                <div className="animate-in fade-in zoom-in duration-300 z-[1004] pointer-events-auto">
                  <InfoTooltip
                    title={displayLabel}
                    content={infoExtra}
                    align="left"
                  />
                </div>
              )}
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
                {infoExtra && (
                  <span className="text-[9px] font-medium text-petroleum/60 mt-0.5 leading-tight italic">
                    {infoExtra}
                  </span>
                )}
                <span className="text-[10px] font-semibold text-gold mt-1 drop-shadow-sm text-center">
                  {upgradeMessage}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. BADGE DE PLANO */}
        {requiredPlan && !isMini && (
          <div
            className={`absolute z-[1003] flex items-center bg-petroleum rounded-full border border-gold/30 shadow-lg pointer-events-none
            top-3 right-3 px-2.5 py-1`}
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
