'use client';

import React from 'react';

interface InfoTooltipProps {
  content: string;
  width?: string;
  align?: 'center' | 'left' | 'right';
}

export const InfoTooltip = ({
  content,
  width = 'w-56',
  align = 'center',
}: InfoTooltipProps) => {
  const alignClasses = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-0',
    right: 'right-0',
  };

  const arrowClasses = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-4',
    right: 'right-4',
  };

  return (
    <div className="group relative flex items-center shrink-0">
      {/* Gatilho: Ícone de interrogação */}
      <div
        className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-200 text-petroleum/60 
      group-hover:border-gold group-hover:text-gold transition-colors cursor-help shadow-sm bg-white"
      >
        <span className="text-[9px] font-semibold">?</span>
      </div>

      {/* Balão do Tooltip (Tema Baseado no Toast) */}
      <div
        className={`
        absolute bottom-full mb-2 z-[1004]
        ${width} ${alignClasses[align]}
        p-3 bg-white text-petroleum text-[10px] font-medium leading-relaxed 
        rounded-lg opacity-0 pointer-events-none 
        group-hover:opacity-100 transition-all duration-300 shadow-xl 
        border border-slate-200 text-justify overflow-hidden
      `}
      >
        {/* Barra Lateral de Acento (Estilo Toast Success) */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold" />

        <p className="pl-1 drop-shadow-sm">{content}</p>

        {/* Triângulo (Seta) - Ajustado para branco com borda sutil */}
        <div
          className={`
          absolute top-full w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45 -mt-1
          ${arrowClasses[align]}
        `}
        />
      </div>
    </div>
  );
};
