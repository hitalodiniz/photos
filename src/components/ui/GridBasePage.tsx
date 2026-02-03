'use client';

import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface GridBasePageProps {
  actions?: ReactNode;
  footerStatus?: ReactNode;
  footerActions?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
  maxWidth?: '7xl' | 'full';
}

export default function GridBasePage({
  actions,
  footerStatus,
  footerActions,
  onBack,
  children,
  maxWidth = '7xl',
}: GridBasePageProps) {
  const containerClass =
    maxWidth === 'full' ? 'w-full px-6' : 'max-w-7xl mx-auto px-6';

  return (
    <div className="min-h-[calc(100vh-55px)] bg-white flex flex-col animate-in fade-in duration-500">
      {/* Barra de Ações Superior - Petroleum Contained */}
      {actions && (
        <div className="sticky top-[55px] z-30">
          <div className={containerClass}>
            <div className="bg-petroleum rounded-luxury border border-white/10 shadow-xl px-4 py-2 md:py-3">
              {actions}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 bg-slate-50/30 py-4">
        <div className={containerClass}>{children}</div>
      </main>

      {/* Rodapé Fixo - Petroleum Standard */}
      <div className="sticky bottom-0 z-40 bg-petroleum border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <div
          className={`${containerClass} flex items-center justify-between py-4`}
        >
          {/* Status - Esquerda */}
          <div className="text-[10px] text-white/90 uppercase tracking-luxury-widest font-semibold truncate mr-4">
            {footerStatus}
          </div>

          {/* Ações - Direita */}
          <div className="flex items-center gap-4 shrink-0">
            {footerActions ||
              (onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="btn-secondary-petroleum px-6 flex items-center gap-2 text-[10px] font-semibold tracking-luxury-widest"
                >
                  <ArrowLeft size={14} /> VOLTAR
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
