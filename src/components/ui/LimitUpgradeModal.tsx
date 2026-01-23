'use client';
import React from 'react';
import { AlertTriangle, ArrowRight, Zap, Info } from 'lucide-react';

import BaseModal from '@/components/ui/BaseModal';

interface LimitUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  planLimit: number;
  photoCount: number;
}

export const LimitUpgradeModal = ({
  isOpen,
  onClose,
  planLimit,
  photoCount,
}: LimitUpgradeModalProps) => {
  if (!isOpen) return null;

  const headerIcon = <AlertTriangle size={20} strokeWidth={2.5} className="text-amber-500" />;

  const footer = (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => window.open('/dashboard/planos', '_blank')}
        className="w-full h-12 bg-champagne hover:bg-white text-petroleum font-bold uppercase text-[10px] tracking-luxury rounded-luxury flex items-center justify-center gap-2 transition-all shadow-lg shadow-champagne/10 active:scale-[0.98]"
      >
        Aumentar Limite Agora
        <ArrowRight size={16} />
      </button>

      <button
        onClick={onClose}
        className="w-full h-10 text-white/40 font-bold uppercase text-[10px] tracking-luxury hover:text-gold rounded-luxury transition-all"
      >
        Continuar com {planLimit} fotos
      </button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Limite do Plano"
      subtitle="Importação Limitada"
      headerIcon={headerIcon}
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="w-full flex items-center gap-4 p-4 rounded-luxury border border-amber-500/20 bg-amber-500/5 transition-all">
          <div className="w-10 h-10 rounded-luxury flex items-center justify-center shrink-0 bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Zap size={20} fill="currentColor" />
          </div>

          <div className="flex-1 text-left min-w-0">
            <p className="text-[14px] font-bold text-petroleum tracking-wide uppercase">
              Capacidade do Plano
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-luxury">
                Limite: {planLimit} Fotos
              </span>
              <span className="text-petroleum/20 text-xs">•</span>
              <span className="text-[10px] font-bold text-petroleum/40 tracking-luxury uppercase">
                Plano Atual
              </span>
            </div>
          </div>
        </div>

        <p className="text-[13px] text-petroleum/70 font-medium leading-relaxed px-1">
          Sua pasta possui <span className="text-petroleum font-bold">{photoCount} fotos</span>. Apenas as primeiras{' '}
          <span className="text-gold font-bold">{planLimit} fotos</span> serão importadas para economizar seu armazenamento.
        </p>

        <div className="flex items-center gap-3 p-4 bg-slate-50 border border-petroleum/10 rounded-luxury italic">
          <Info size={16} className="text-gold shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-luxury text-petroleum/60">
            As fotos excedentes não serão processadas.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
