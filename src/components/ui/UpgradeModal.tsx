'use client';

import React, { useMemo } from 'react';
import { Crown, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';

import {
  PlanKey,
  PlanPermissions,
  PERMISSIONS_BY_PLAN,
  FEATURE_DESCRIPTIONS,
  // FIX 4: Substituído findNextPlanWithFeature por findNextPlanKeyWithFeature.
  //
  // MOTIVO: findNextPlanWithFeature retorna o *nome de exibição* do plano
  // conforme o segmento (ex: 'Start', 'Pro', 'Premium'). Esses valores não
  // são chaves válidas de PERMISSIONS_BY_PLAN (que usa 'FREE'|'START'|...).
  // Portanto PERMISSIONS_BY_PLAN['Start'] === undefined, e planBenefits
  // sempre retornava [].
  //
  // findNextPlanKeyWithFeature retorna a PlanKey canônica ('START', 'PRO'...),
  // que é a chave correta para acessar PERMISSIONS_BY_PLAN.
  //
  // Para exibição no modal (ex: "Migrar para o Start"), usamos
  // PERMISSIONS_BY_PLAN[nextPlanKey] se necessário, ou mantemos a PlanKey
  // como label — que já é suficientemente legível no contexto do modal.
  findNextPlanKeyWithFeature,
  findNextPlanWithFeature, // mantido para o nome de exibição no texto do modal
} from '@/core/config/plans';
import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';

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

  // FIX 4c: planBenefits agora encontra permissões reais porque nextPlanKey
  // é 'START'|'PLUS'|'PRO'|'PREMIUM', não 'Start'|'Plus'|'Pro'|'Premium'.
  const planBenefits = useMemo(() => {
    const perms = PERMISSIONS_BY_PLAN[nextPlanKey];
    if (!perms) return [];

    return [
      `Até ${perms.maxGalleries} ${terms.items} ativas`,
      `Capacidade de ${perms.maxPhotosPerGallery} itens por ${terms.item}`,
      perms.removeBranding
        ? 'Remoção total de branding (White Label)'
        : 'Identidade visual profissional',
      perms.canCaptureLeads
        ? 'Captura e exportação de leads'
        : 'Interação avançada com usuários',
      `Suporte a até ${perms.maxExternalLinks} links externos`,
    ];
  }, [nextPlanKey, terms]);

  if (!isOpen) return null;

  const headerIcon = (
    <Crown size={20} strokeWidth={2.5} className="text-gold" />
  );

  const footer = (
    <div className="grid grid-cols-2 gap-3 w-full">
      <button onClick={onClose} className="btn-secondary-white">
        Talvez mais tarde
      </button>
      <button
        onClick={() => window.open('/dashboard/planos', '_blank')}
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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={scenarioType === 'limit' ? 'Limite Atingido' : 'Recurso Premium'}
      subtitle={
        scenarioType === 'limit'
          ? `O limite de ${featureName} foi alcançado.`
          : `Upgrade Necessário - ${featureName}`
      }
      headerIcon={headerIcon}
      footer={footer}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Header do Recurso */}
        <div className="w-full flex items-center gap-4 p-4 rounded-luxury border border-gold/20 bg-gold/5">
          <div className="w-10 h-10 rounded-luxury flex items-center justify-center shrink-0 bg-gold text-petroleum shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <Lock size={20} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[14px] font-bold text-petroleum tracking-wide uppercase truncate">
              {featureName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold text-petroleum/60 uppercase tracking-luxury">
                {scenarioType === 'limit'
                  ? `Limite do plano ${planKey} atingido`
                  : `Bloqueado no Plano ${planKey}`}
              </span>
            </div>
          </div>
        </div>

        {/* Texto Explicativo com Descrição Amigável */}
        <div className="px-1 space-y-2">
          {displayDescription && (
            <p className="text-[14px] text-petroleum font-bold leading-relaxed border-l-2 border-gold/40 pl-3 py-0.5 bg-slate-50/50">
              {displayDescription}
            </p>
          )}

          <p className="text-[13px] text-petroleum/80 font-medium leading-relaxed">
            {scenarioType === 'limit' ? (
              <>
                Você atingiu o limite de {featureName}. Faça o upgrade para ter
                mais espaço e recursos avançados para seu {terms.singular}.
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
                ou superior no {terms.site_name}.
              </>
            )}
          </p>
        </div>

        {/* Lista de Benefícios */}
        <div className="space-y-2.5 p-4 bg-slate-50 border border-petroleum/10 rounded-luxury">
          <p className="text-[11px] font-semibold uppercase tracking-luxury text-petroleum/90 mb-2">
            Vantagens ao migrar para o{' '}
            <span className="text-gold">{nextPlanDisplayName}</span>:
          </p>
          {planBenefits.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-gold shrink-0" />
              <span className="text-[12px] font-semibold tracking-luxury text-petroleum/80">
                {benefit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BaseModal>
  );
}
