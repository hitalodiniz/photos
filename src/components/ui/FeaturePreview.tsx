'use client';

import React, { useState } from 'react';
import {
  Info,
  Check,
  Zap,
  Rocket,
  Star,
  Crown,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  FEATURE_DESCRIPTIONS,
  PlanPermissions,
  PERMISSIONS_BY_PLAN,
  PlanKey,
  planOrder,
} from '@/core/config/plans';
import { Sheet, SheetSection } from '@/components/ui/Sheet';

/**
 * FEATURE PREVIEW - Usando Sheet Component do Sistema
 *
 * Features:
 * - Sheet lateral padrão do sistema
 * - Preview de vídeo/imagem em destaque
 * - Comparação visual entre planos
 * - Indicadores de disponibilidade
 * - Mobile: slide from bottom
 * - Desktop: slide from right
 */

// Ícones dos planos
const PLAN_ICONS: Record<PlanKey, any> = {
  FREE: Zap,
  START: Rocket,
  PLUS: Star,
  PRO: Crown,
  PREMIUM: Sparkles,
};

export default function FeaturePreview({
  featureKey,
}: {
  featureKey: keyof PlanPermissions;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const data = FEATURE_DESCRIPTIONS[featureKey];
  if (!data?.label) return null;

  // Determina quais planos têm este recurso
  const getPlanAvailability = () => {
    return planOrder.map((planKey) => {
      const perms = PERMISSIONS_BY_PLAN[planKey];
      const value = perms[featureKey];

      let hasFeature = false;
      let displayValue = '';

      if (typeof value === 'boolean') {
        hasFeature = value;
        displayValue = value ? 'Ativo' : 'Não disponível';
      } else if (typeof value === 'number') {
        hasFeature = value > 0;
        displayValue = value > 0 ? String(value) : 'Não';
      } else if (value === 'unlimited') {
        hasFeature = true;
        displayValue = 'Ilimitado';
      } else if (typeof value === 'string') {
        hasFeature = true;
        displayValue = String(value);
      }

      return {
        planKey,
        hasFeature,
        displayValue,
      };
    });
  };

  const availability = getPlanAvailability();
  const lowestPlanWithFeature =
    availability.find((a) => a.hasFeature)?.planKey || 'PREMIUM';

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gold/10 text-gold hover:bg-gold hover:text-white transition-all cursor-help"
      >
        <Info size={11} strokeWidth={3} />
      </button>

      {/* Sheet */}
      <Sheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={data.label}
        subtitle={`Disponível a partir do plano ${lowestPlanWithFeature}`}
        icon={<Sparkles size={18} strokeWidth={2.5} />}
        maxWidth="lg"
        position="right"
      >
        {/* 🎯 PREVIEW MEDIA */}
        {data.previewUrl && (
          <SheetSection>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="w-full aspect-video bg-gradient-to-br from-slate-900 to-slate-800 relative">
                {data.previewType === 'video' ? (
                  <video
                    src={data.previewUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={data.previewUrl}
                    className="w-full h-full object-cover"
                    alt={data.label}
                  />
                )}

                {/* Badge no canto */}
                <div className="absolute top-3 right-3 bg-gold/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Preview
                </div>
              </div>
            </div>
          </SheetSection>
        )}

        {/* 🎯 DESCRIÇÃO */}
        <SheetSection title="Sobre este Recurso">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-sm text-petroleum/80 leading-relaxed">
              {data.description}
            </p>
          </div>
        </SheetSection>

        {/* 🎯 COMPARAÇÃO DE PLANOS */}
        <SheetSection title="Disponibilidade por Plano">
          <div className="space-y-2">
            {availability.map(({ planKey, hasFeature, displayValue }) => {
              const Icon = PLAN_ICONS[planKey];
              return (
                <div
                  key={planKey}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all
                    ${
                      hasFeature
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${hasFeature ? 'bg-emerald-100' : 'bg-slate-200'}
                    `}
                    >
                      <Icon
                        size={16}
                        className={
                          hasFeature ? 'text-emerald-600' : 'text-slate-400'
                        }
                        strokeWidth={2.5}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-petroleum">
                        {planKey}
                      </p>
                      <p className="text-xs text-slate-500">{displayValue}</p>
                    </div>
                  </div>

                  {hasFeature ? (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check size={16} className="text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center">
                      <Lock
                        size={12}
                        className="text-slate-500"
                        strokeWidth={2.5}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetSection>

        {/* 🎯 INFO FINAL */}
        <SheetSection>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                <Sparkles size={16} className="text-gold" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-petroleum mb-1">
                  Disponível a partir do {lowestPlanWithFeature}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Compare os planos acima e escolha o que melhor se adapta às
                  suas necessidades. Todos os recursos estão destacados nos
                  cards de cada plano.
                </p>
              </div>
            </div>
          </div>
        </SheetSection>
      </Sheet>
    </>
  );
}
