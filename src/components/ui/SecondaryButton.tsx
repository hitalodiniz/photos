'use client';

import React from 'react';

interface SecondaryButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode; // Adicionado para suportar ícones do Lucide
}

export default function SecondaryButton({
  label,
  onClick,
  className = '',
  icon,
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        /* Tipografia Editorial (Style Guide) */
        text-[10px] font-bold uppercase tracking-[0.2em]
        
        /* Layout e Dimensões */
        h-11 px-8 flex items-center justify-center gap-2 
        whitespace-nowrap transition-all duration-300
        
        /* Cores e Bordas */
        bg-white text-slate-500 border border-slate-200 rounded-[0.5rem]
        
        /* Estados Interativos */
        hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300
        active:scale-95 disabled:opacity-50
        
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
    </button>
  );
}
