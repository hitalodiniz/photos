'use client';

import { ChevronDown, Loader2 } from 'lucide-react';

interface ExpandButtonProps {
  onClick: () => void;
  isLoading?: boolean;
}

export default function ExpandButton({
  onClick,
  isLoading,
}: ExpandButtonProps) {
  return (
    <div className="mt-16 flex justify-center pb-20">
      <button
        onClick={onClick}
        disabled={isLoading}
        className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-slate-900 text-white px-12 py-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl shadow-black/20 disabled:opacity-50"
      >
        <span className="relative z-10 flex items-center gap-2 transition-colors duration-500 group-hover:text-slate-900">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gold transition-transform group-hover:translate-y-1" />
          )}
          <span className="font-barlow">Expandir Acervo</span>
        </span>

        {/* Efeito de preenchimento Dourado (Overlay) */}
        <div className="absolute inset-0 bg-[#D4AF37] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]" />
      </button>
    </div>
  );
}
