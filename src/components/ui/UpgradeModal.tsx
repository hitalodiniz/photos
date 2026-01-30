'use client';

import React from 'react';
import { Crown, ArrowRight, Zap, CheckCircle2, Lock } from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import { usePlan } from '@/context/PlanContext';
import { PlanKey } from '@/core/config/plans';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  featureName,
}: UpgradeModalProps) {
  const { planKey } = usePlan();

  // 🎯 Lógica de Progressão: Identifica o próximo nível
  const planOrder: PlanKey[] = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'];
  const currentIndex = planOrder.indexOf(planKey as PlanKey);
  const nextPlanKey = planOrder[currentIndex + 1] || 'PREMIUM';

  if (!isOpen) return null;

  const headerIcon = (
    <Crown size={20} strokeWidth={2.5} className="text-gold" />
  );

  const footer = (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => window.open('/dashboard/planos', '_blank')}
        className="w-full h-12 bg-petroleum hover:bg-black text-champagne font-bold uppercase text-[10px] tracking-luxury rounded-luxury flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98]"
      >
        Migrar para o Plano {nextPlanKey}
        <ArrowRight size={16} />
      </button>

      <button
        onClick={onClose}
        className="w-full h-10 text-petroleum/40 font-bold uppercase text-[10px] tracking-luxury hover:text-petroleum rounded-luxury transition-all"
      >
        Talvez mais tarde
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
      maxWidth="md"
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
              <span className="text-[10px] font-bold text-gold uppercase tracking-luxury">
                Bloqueado no Plano {planKey}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[13px] text-petroleum/70 font-medium leading-relaxed px-1">
          O recurso{' '}
          <span className="text-petroleum font-bold">{featureName}</span> é
          exclusivo para assinantes do plano{' '}
          <span className="text-gold font-bold">{nextPlanKey}</span> ou
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
              <CheckCircle2 size={12} className="text-gold shrink-0" />
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
