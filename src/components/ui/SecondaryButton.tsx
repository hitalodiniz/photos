'use client';

import React from 'react';

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
        /* Tipografia: Exata como na imagem */
        text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em]
        
        /* Layout responsivo e compacto */
        h-10 px-6 flex items-center justify-center gap-2 
        transition-all duration-300 rounded-[0.5rem]
        
        /* Cores e Borda: Azul acinzentado suave da imagem */
        bg-white text-[#475569] border border-[#CBD5E1] shadow-sm
        
        /* Estados Interativos */
        hover:bg-slate-50 hover:text-slate-900 hover:border-[#94A3B8]
        active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
        
        ${className}
      `}
    >
      {icon && <span className="shrink-0 text-[#475569]">{icon}</span>}
      {label}
    </button>
  );
}
