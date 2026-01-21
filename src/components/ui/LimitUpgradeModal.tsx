'use client';
import React from 'react';
import { X, AlertTriangle, ArrowRight, Zap, Info } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-md flex items-center justify-center px-6 md:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="w-full md:max-w-xl bg-petroleum border border-white/10 rounded-[0.5rem] shadow-2xl flex flex-col h-auto max-h-[85vh] relative animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* 1. TOPO: AVISO DE ATENÇÃO (Seguindo o padrão Wi-Fi) */}
        <div className="flex flex-col shrink-0">
          <div className="bg-amber-500/10 py-4 flex items-center justify-center gap-2.5 border-b border-white/5 shrink-0">
            <AlertTriangle
              size={14}
              className="text-amber-500"
              strokeWidth={2.5}
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-500">
              Limite do Plano Atingido
            </span>
          </div>

          <div className="px-8 py-7 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div className="min-w-0 text-left">
              <h2 className="text-2xl text-white font-semibold tracking-tight">
                Importação Limitada
              </h2>
              <p className="text-[#F3E5AB] text-[11px] font-semibold uppercase tracking-[0.15em] mt-2">
                Sua pasta possui {photoCount} fotos
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-white bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* 2. CONTEÚDO CENTRAL: FORMATO DE LISTAGEM/ITEM */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 bg-black/20 min-h-0 no-scrollbar">
          <div className="w-full flex items-center gap-5 p-6 rounded-xl border border-amber-500/20 bg-amber-500/5 transition-all">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Zap size={22} fill="currentColor" />
            </div>

            <div className="flex-1 text-left min-w-0">
              <p className="text-[15px] font-bold text-white tracking-wide uppercase">
                Capacidade do Plano
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                  Limite: {planLimit} Fotos
                </span>
                <span className="text-white text-xs">•</span>
                <span className="text-[11px] font-bold text-white tracking-wide uppercase italic">
                  Plano Atual
                </span>
              </div>
            </div>
          </div>

          <p className="text-[13px] text-white font-medium leading-relaxed px-2">
            Identificamos que sua pasta no Drive é maior que o permitido. Apenas
            as primeiras{' '}
            <span className="text-[#F3E5AB] font-bold">{planLimit} fotos</span>{' '}
            serão importadas e exibidas para seu cliente.
          </p>

          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-lg italic">
            <Info size={16} className="text-[#F3E5AB] shrink-0" />
            <p className="text-[11px] text-white font-medium">
              As fotos excedentes não serão processadas para economizar seu
              armazenamento.
            </p>
          </div>
        </div>

        {/* 3. RODAPÉ: BOTÕES DE AÇÃO (Estilo Premium) */}
        <div className="px-8 py-8 bg-petroleum border-t border-white/5 shrink-0 flex flex-col gap-3">
          <button
            onClick={() => window.open('/dashboard/planos', '_blank')}
            className="w-full h-12 bg-[#F3E5AB] hover:bg-white text-black font-bold uppercase text-[11px] tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(243,229,171,0.3)] active:scale-[0.98]"
          >
            Aumentar Limite Agora
            <ArrowRight size={16} />
          </button>

          <button
            onClick={onClose}
            className="w-full h-10 text-white font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-white/5 rounded-lg transition-all"
          >
            Continuar com {planLimit} fotos
          </button>
        </div>
      </div>
    </div>
  );
};
