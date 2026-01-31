'use client';

import React, { useMemo } from 'react';
import { Crown, ArrowRight, Zap, CheckCircle2, Lock } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';

import { PlanKey, PlanPermissions } from '@/core/config/plans';
import { usePlan } from '@/hooks/usePlan';
import { findNextPlanWithFeature } from '@/core/config/plans';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureKey?: keyof PlanPermissions;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  featureName,
  featureKey,
}: UpgradeModalProps) {
  const { planKey, segment } = usePlan();

  // 🎯 Lógica de Progressão: Identifica o próximo nível com a feature
  const nextPlanKey = useMemo(() => {
    if (!featureKey) return 'PREMIUM'; // Garante uso da chave técnica
    return findNextPlanWithFeature(planKey as PlanKey, featureKey, segment);
  }, [planKey, featureKey, segment]);

  if (!isOpen) return null;

  const headerIcon = (
    <Crown size={20} strokeWidth={2.5} className="text-gold" />
  );

  const footer = (
    <div className="grid grid-cols-2 gap-3 w-full">
      <button onClick={onClose} className="btn-luxury-secondary">
        Talvez mais tarde
      </button>
      <button
        onClick={() => window.open('/dashboard/planos', '_blank')}
        className="btn-luxury-primary"
      >
        Migrar para o Plano {nextPlanKey}
        <ArrowRight size={16} />
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Recurso Premium"
      subtitle="Upgrade Necessário"
      headerIcon={headerIcon}
      footer={footer}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Card de Feature Bloqueada */}
        <div className="w-full flex items-center gap-4 p-4 rounded-luxury border border-gold/20 bg-gold/5 transition-all">
          <div className="w-10 h-10 rounded-luxury flex items-center justify-center shrink-0 bg-gold text-petroleum shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <Lock size={20} />
          </div>

          <div className="flex-1 text-left min-w-0">
            <p className="text-[14px] font-bold text-petroleum tracking-wide uppercase">
              {featureName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-semibold text-petroleum uppercase tracking-luxury">
                Bloqueado no Plano {planKey}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[13px] text-petroleum/70 font-medium leading-relaxed px-1">
          O recurso{' '}
          <span className="text-petroleum font-bold">{featureName}</span> é
          exclusivo para assinantes do plano{' '}
          <span className="text-petroleum font-bold">{nextPlanKey}</span> ou
          superior.
        </p>

        {/* Lista de Benefícios do Próximo Plano */}
        <div className="space-y-2.5 p-4 bg-slate-50 border border-petroleum/10 rounded-luxury">
          <p className="text-[9px] font-bold uppercase tracking-luxury text-petroleum/40 mb-2">
            Vantagens do Upgrade:
          </p>
          {[
            'Customização Visual Avançada',
            'Sincronização com Google Drive',
            "Remoção de marca d'água",
            'Suporte prioritário via WhatsApp',
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-petroleum shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-petroleum/80">
                {benefit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BaseModal>
  );
}
