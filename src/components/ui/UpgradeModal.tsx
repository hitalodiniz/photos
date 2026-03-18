'use client';

import React, { useMemo, useState } from 'react';
import { Crown, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';

import {
  PlanKey,
  PlanPermissions,
  PERMISSIONS_BY_PLAN,
  FEATURE_DESCRIPTIONS,
  getPlanBenefits,
  type PlanBenefitItem,
  // FIX 4: findNextPlanKeyWithFeature retorna PlanKey canônica para PERMISSIONS_BY_PLAN.
  findNextPlanKeyWithFeature,
  findNextPlanWithFeature,
} from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';
import { UpgradeSheet } from './Upgradesheet';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  description?: string;
  featureKey?: keyof PlanPermissions;
  scenarioType: 'limit' | 'feature';
}

export default function UpgradeModal({
  isOpen,
  onClose,
  featureName,
  description,
  featureKey,
  scenarioType = 'feature',
}: UpgradeModalProps) {
  const { planKey } = usePlan();
  const { terms, segment } = useSegment();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // FIX 4a: nextPlanKey agora é a PlanKey canônica ('START', 'PRO'...)
  // usada para acessar PERMISSIONS_BY_PLAN corretamente.
  const nextPlanKey = useMemo((): PlanKey => {
    if (!featureKey) return 'PREMIUM';
    return (
      findNextPlanKeyWithFeature(planKey as PlanKey, featureKey) ?? 'PREMIUM'
    );
  }, [planKey, featureKey]);

  // FIX 4b: nome de exibição separado da chave.
  // findNextPlanWithFeature retorna o nome localizado por segmento (ex: 'Start').
  const nextPlanDisplayName = useMemo(() => {
    if (!featureKey) return 'Premium';
    return (
      findNextPlanWithFeature(planKey as PlanKey, featureKey, segment) ??
      nextPlanKey
    );
  }, [planKey, featureKey, segment, nextPlanKey]);

  const displayDescription = useMemo(() => {
    if (description) return description;
    if (featureKey) return FEATURE_DESCRIPTIONS[featureKey]?.description;
    return null;
  }, [description, featureKey]);

  const planBenefits = useMemo((): PlanBenefitItem[] => {
    const perms = PERMISSIONS_BY_PLAN[nextPlanKey];
    if (!perms) return [];
    return getPlanBenefits(perms, terms);
  }, [nextPlanKey, terms]);

  // Se não estiver aberto nem o modal nem o sheet, não renderiza nada
  if (!isOpen && !isSheetOpen) return null;

  const headerIcon = (
    <Crown size={20} strokeWidth={2.5} className="text-gold" />
  );

  const footer = (
    <div className="grid grid-cols-2 gap-3 w-full">
      <button onClick={onClose} className="btn-secondary-white">
        Talvez mais tarde
      </button>
      <button
        onClick={() => {
          // Fecha o modal base visualmente e abre o sheet
          setIsSheetOpen(true);
        }}
        className="btn-luxury-primary"
      >
        {scenarioType === 'limit'
          ? 'Aumentar Limite'
          : `Migrar para o ${nextPlanDisplayName}`}
        <ArrowRight size={16} />
      </button>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen && !isSheetOpen} // Esconde o BaseModal quando o Sheet abre
        onClose={onClose}
        title={
          scenarioType === 'limit' ? 'Limite Atingido' : 'Recurso Superior'
        }
        subtitle={
          scenarioType === 'limit'
            ? `O limite de ${featureName} foi alcançado.`
            : `Upgrade Necessário - ${featureName}`
        }
        headerIcon={headerIcon}
        footer={footer}
        maxWidth="3xl"
      >
        <div className="space-y-3">
          {/* Header do Recurso */}
          <div className="w-full flex items-center gap-2 p-2 rounded-luxury border border-gold/20 bg-gold/5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-gold text-petroleum shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Lock size={14} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[12px] font-bold text-petroleum tracking-wide uppercase truncate">
                {featureName}
                <span className="text-[12px] font-semibold text-petroleum/60 uppercase tracking-luxury ml-2">
                  {scenarioType === 'limit'
                    ? `- Limite do plano ${planKey} atingido`
                    : `- Bloqueado no Plano ${planKey}`}
                </span>
              </p>
            </div>
          </div>

          {/* Texto Explicativo com Descrição Amigável */}
          <div className="px-1 space-y-2">
            {displayDescription && (
              <p className="text-[14px] text-petroleum font-semibold leading-relaxed border-l-2 border-gold/40 pl-3 py-0.5 bg-slate-50/50">
                {displayDescription}
              </p>
            )}

            <p className="text-[13px] text-petroleum/80 font-medium leading-relaxed">
              {scenarioType === 'limit' ? (
                <>
                  Você atingiu o limite de {featureName}. Faça o upgrade para
                  ter mais espaço e recursos avançados para seu {terms.singular}
                  .
                </>
              ) : (
                <>
                  O recurso{' '}
                  <span className="text-petroleum font-semibold">
                    {featureName}
                  </span>{' '}
                  é exclusivo para usuários do plano{' '}
                  <span className="text-petroleum font-extrabold">
                    {nextPlanDisplayName}
                  </span>{' '}
                  ou superior.
                </>
              )}
            </p>
          </div>
          <div className="h-px bg-petroleum/10 my-2" />

          {/* Lista de Benefícios */}

          <p className="text-[11px] font-semibold uppercase tracking-luxury-wide text-petroleum/90 mb-1">
            Vantagens ao migrar para o{' '}
            <span className="text-gold font-bold">{nextPlanDisplayName}</span>
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 list-none p-0 m-0">
            {planBenefits.map((benefit, i) => (
              <li key={i} className="flex gap-1">
                <CheckCircle2
                  size={14}
                  className="text-gold shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-luxury text-petroleum/90 block">
                    {benefit.label}
                  </span>
                  <span className="text-[12px] text-petroleum/80 ">
                    {benefit.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </BaseModal>

      {/* Sheet de upgrade — abre ao clicar no CTA do modal */}
      <UpgradeSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          onClose(); // Garante que, ao fechar o sheet, todo o fluxo modal é finalizado
        }}
        featureKey={featureKey}
        featureName={featureName}
      />
    </>
  );
}
