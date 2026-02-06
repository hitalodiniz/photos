'use client';
import React from 'react';

{
  /* Componente FeatureItem - Design Compacto e Alinhado */
}
export default function FeatureItem({ icon, title, desc }) {
  return (
    <div className="flex flex-row items-center gap-4 group transition-all w-full">
      {/* Ícone: Fundo sólido suave para destacar no branco translúcido */}
      <div
        className="w-12 h-12 md:w-16 md:h-16 shrink-0 bg-luxury-bg rounded-2xl flex items-center justify-center 
        border border-gold/50 group-hover:border-gold group-hover:bg-champagne-dark transition-all text-champagneshadow-sm"
      >
        {icon}
      </div>

      {/* Textos: Alinhados imediatamente à frente do ícone */}
      <div className="flex flex-col min-w-0">
        <h3 className="text-slate-900 font-semibold text-[12px] md:text-[16px] leading-tight mb-1">
          {title}
        </h3>
        <p
          className="text-slate-500 text-[12px] md:text-[14px] leading-tight transition-all 
        group-hover:text-slate-800 italic truncate 
        sm:whitespace-normal
        font-light tracking-wide whitespace-normal break-words"
        >
          {desc}
        </p>
      </div>
    </div>
  );
}
