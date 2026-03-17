'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type TooltipSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface InfoTooltipProps {
  title?: string;
  content: React.ReactNode;
  width?: string;
  size?: TooltipSize;
  align?: 'center' | 'left' | 'right';
  position?: 'top' | 'bottom';
  /**
   * Renderiza via createPortal no <body> com position:fixed.
   * Use quando o tooltip estiver dentro de containers com
   * overflow:hidden/auto que cortam o balão (ex: sidebar, modais).
   * Não altera o visual — apenas o método de renderização.
   */
  portal?: boolean;
}

// ─── Versão CSS-only (comportamento original) ────────────────────────────────
function InlineTooltip({
  title,
  content,
  width,
  size,
  align = 'center',
  position = 'top',
}: Omit<InfoTooltipProps, 'portal'>) {
  const sizeClasses: Record<TooltipSize, string> = {
    md: 'w-56',
    lg: 'w-64',
    xl: 'w-72',
    '2xl': 'w-80',
    '3xl': 'w-96',
  };
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
  const positionClasses =
    position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  const arrowPosition =
    position === 'top'
      ? 'top-full border-r border-b -mt-1'
      : 'bottom-full border-l border-t -mb-1';

  return (
    <div className="group relative flex items-center shrink-0">
      <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-200 text-petroleum/60 group-hover:border-gold group-hover:text-gold transition-colors cursor-help shadow-sm bg-white">
        <span className="text-[9px] font-semibold">?</span>
      </div>

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
          <div className="drop-shadow-sm text-petroleum/80 italic">
            {content}
          </div>
        </div>
        <div
          className={`absolute w-2 h-2 bg-white rotate-45 border-slate-200 ${arrowPosition} ${arrowAlign[align]}`}
        />
      </div>
    </div>
  );
}

// ─── Versão Portal (para containers com overflow) ────────────────────────────
function PortalTooltip({
  title,
  content,
  width,
  size,
  align = 'center',
  position = 'top',
}: Omit<InfoTooltipProps, 'portal'>) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const sizeClasses: Record<TooltipSize, string> = {
    md: 'w-56', // 224px
    lg: 'w-64', // 256px
    xl: 'w-72', // 288px
    '2xl': 'w-80', // 320px
    '3xl': 'w-96', // 384px
  };
  const tipWidthPx: Record<TooltipSize, number> = {
    md: 224,
    lg: 256,
    xl: 288,
    '2xl': 320,
    '3xl': 384,
  };
  const finalWidthClass = width || (size ? sizeClasses[size] : 'w-56');
  // Extrai px para cálculo de posição (fallback md=224)
  const tipW = size ? tipWidthPx[size] : 224;

  const calcCoords = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const gap = 8;
    const tipH = tipRef.current?.offsetHeight ?? 120;
    const vp = { w: window.innerWidth, h: window.innerHeight };

    const top = position === 'top' ? r.top - tipH - gap : r.bottom + gap;

    let left =
      align === 'left'
        ? r.left
        : align === 'right'
          ? r.right - tipW
          : r.left + r.width / 2 - tipW / 2;

    left = Math.max(8, Math.min(left, vp.w - tipW - 8));

    setCoords({ top, left });
  }, [align, position, tipW]);

  const show = useCallback(() => {
    calcCoords();
    setOpen(true);
  }, [calcCoords]);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    calcCoords(); // recalcula após render para pegar altura real
    window.addEventListener('scroll', calcCoords, true);
    window.addEventListener('resize', calcCoords);
    return () => {
      window.removeEventListener('scroll', calcCoords, true);
      window.removeEventListener('resize', calcCoords);
    };
  }, [open, calcCoords]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !tipRef.current?.contains(e.target as Node)
      )
        hide();
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open, hide]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, hide]);

  // Posição da seta relativa ao botão no eixo X
  const arrowOffsetLeft = (() => {
    if (!btnRef.current) return 20;
    const r = btnRef.current.getBoundingClientRect();
    const btnCenterInTip = r.left + r.width / 2 - coords.left;
    return Math.max(10, Math.min(btnCenterInTip - 4, tipW - 18));
  })();

  const tooltip = open ? (
    <div
      ref={tipRef}
      role="tooltip"
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ top: coords.top, left: coords.left }}
      className={`
        fixed z-[99999] ${finalWidthClass}
        p-3 bg-white text-petroleum text-[10px] font-medium leading-relaxed
        rounded-lg shadow-xl border border-slate-200 text-left overflow-hidden
        pointer-events-auto
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
      {/* Seta */}
      <div
        style={{ left: arrowOffsetLeft }}
        className={`
          absolute w-2 h-2 bg-white rotate-45 border-slate-200
          ${
            position === 'top'
              ? 'top-full border-r border-b -mt-1'
              : 'bottom-full border-l border-t -mb-1'
          }
        `}
      />
    </div>
  ) : null;

  return (
    <div className="relative flex items-center shrink-0">
      <div
        ref={btnRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={(e) => {
          e.stopPropagation();
          open ? hide() : show();
        }}
        className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-200 text-petroleum/60 hover:border-gold hover:text-gold transition-colors cursor-help shadow-sm bg-white"
      >
        <span className="text-[9px] font-semibold">?</span>
      </div>

      {typeof window !== 'undefined' && tooltip
        ? createPortal(tooltip, document.body)
        : null}
    </div>
  );
}

// ─── Export único — mesma API, prop portal opt-in ────────────────────────────
export const InfoTooltip = ({ portal = false, ...props }: InfoTooltipProps) =>
  portal ? <PortalTooltip {...props} /> : <InlineTooltip {...props} />;