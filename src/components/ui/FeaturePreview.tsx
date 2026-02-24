'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { FEATURE_DESCRIPTIONS, PlanPermissions } from '@/core/config/plans';

export default function FeaturePreview({
  featureKey,
  align = 'left',
}: {
  featureKey: keyof PlanPermissions;
  align?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const data = FEATURE_DESCRIPTIONS[featureKey as string];
  if (!data?.label) return null;

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleOpen = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    // Dá 300ms para o usuário mover o mouse do ícone para o card
    closeTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  // Limpa o timeout se o componente for desmontado
  useEffect(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex items-center"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
      >
        <div
          className={`
          flex items-center justify-center w-4 h-4 rounded-full transition-all cursor-help
          ${isOpen ? 'bg-gold text-white scale-110 shadow-lg' : 'bg-gold/10 text-gold'}
        `}
        >
          <Info size={11} strokeWidth={3} />
        </div>
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] pointer-events-none"
            // Importante: pointer-events-none no container, mas auto no card
          >
            {/* Fundo Escurecido (opcional se quiser interagir com o resto da tela) */}
            <div className="absolute inset-0 bg-petroleum/40 backdrop-blur-[2px] animate-in fade-in duration-200" />

            <div
              onMouseEnter={handleOpen} // Cancela o fechamento ao entrar no card
              onMouseLeave={handleClose} // Inicia fechamento ao sair do card
              className={`
              fixed w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 
              overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200
            `}
              style={{
                top: `${coords.top - 15}px`,
                left:
                  align === 'left'
                    ? `${coords.left}px`
                    : `${coords.left + coords.width - 320}px`, // 320px é a largura (w-80)
                transform: 'translateY(-100%)',
              }}
            >
              {data.previewUrl && (
                <div className="w-full aspect-video bg-black border-b border-slate-100">
                  {data.previewType === 'video' ? (
                    <video
                      src={data.previewUrl}
                      controls // Permite dar play/pause manualmente
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={data.previewUrl}
                      className="w-full h-full object-cover"
                      alt={data.label}
                    />
                  )}
                </div>
              )}

              <div className="p-5 relative bg-white">
                <div className="absolute left-0 top-5 bottom-5 w-1 bg-gold rounded-r-full" />
                <div className="pl-3">
                  <h4 className="text-[12px] font-bold uppercase tracking-widest text-petroleum mb-1.5">
                    {data.label}
                  </h4>
                  <p className="text-[11px] text-petroleum/70 leading-relaxed italic">
                    {data.description}
                  </p>
                </div>
              </div>

              <div
                className={`absolute bottom-[-6px] w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45`}
                style={{
                  left: align === 'left' ? '16px' : 'auto',
                  right: align === 'right' ? '16px' : 'auto',
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
