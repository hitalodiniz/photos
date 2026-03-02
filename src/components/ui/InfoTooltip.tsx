'use client';

import React from 'react';

// Tipagem para os novos tamanhos (T-shirt sizes)
type TooltipSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface InfoTooltipProps {
  title?: string;
  /** Texto ou JSX (ReactNode); use <div> para conteúdo com blocos. */
  content: React.ReactNode;
  width?: string; // Mantido para compatibilidade com o que já existe
  size?: TooltipSize; // Nova opção de tamanho padrão
  align?: 'center' | 'left' | 'right';
  position?: 'top' | 'bottom'; // Nova opção de posição
}

export const InfoTooltip = ({
  title,
  content,
  width,
  size,
  align = 'center',
  position = 'top', // Default mantém o comportamento antigo (em cima)
}: InfoTooltipProps) => {
  // Mapeamento de larguras mantendo a w-56 como fallback (padrão anterior)
  const sizeClasses: Record<TooltipSize, string> = {
    md: 'w-56',
    lg: 'w-64',
    xl: 'w-72',
    '2xl': 'w-80',
    '3xl': 'w-96',
  };

  // Se 'width' (ex: 'w-40') for passado, ele tem prioridade para não quebrar o legado
  // Se 'size' for passado, usa o mapeamento. Se nenhum, usa w-56.
  const finalWidth = width || (size ? sizeClasses[size] : 'w-56');

  const alignClasses = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-0',
    right: 'right-0',
  };

  const arrowAlign = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-4',
    right: 'right-4',
  };

  // Lógica de inversão de posição
  const positionClasses =
    position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  const arrowPosition =
    position === 'top'
      ? 'top-full border-r border-b -mt-1'
      : 'bottom-full border-l border-t -mb-1';

  return (
    <div className="group relative flex items-center shrink-0">
      {/* Gatilho */}
      <div
        className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-200 text-petroleum/60 
      group-hover:border-gold group-hover:text-gold transition-colors cursor-help shadow-sm bg-white"
      >
        <span className="text-[9px] font-semibold">?</span>
      </div>

      {/* Balão do Tooltip */}
      <div
        className={`
        absolute z-[1004]
        ${finalWidth} ${alignClasses[align]} ${positionClasses}
        p-3 bg-white text-petroleum text-[10px] font-medium leading-relaxed 
        rounded-lg opacity-0 pointer-events-none 
        group-hover:opacity-100 transition-all duration-300 shadow-xl 
        border border-slate-200 text-left overflow-hidden
      `}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold" />

        <div className="pl-1">
          {title && (
            <p className="font-bold uppercase tracking-widest text-[9px] text-gold mb-1 leading-none">
              {title}
            </p>
          )}
          <div className="drop-shadow-sm text-petroleum/80 italic">{content}</div>
        </div>

        {/* Seta Dinâmica */}
        <div
          className={`
          absolute w-2 h-2 bg-white rotate-45 border-slate-200
          ${arrowPosition}
          ${arrowAlign[align]}
        `}
        />
      </div>
    </div>
  );
};
