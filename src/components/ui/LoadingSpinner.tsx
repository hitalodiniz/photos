'use client';

import React, { useState } from 'react';
import { Play, ImageIcon, Info, X } from 'lucide-react';
import { FEATURE_DESCRIPTIONS, PlanPermissions } from '@/core/config/plans';

export default function FeaturePreview({
  featureKey,
  align = 'left',
}: {
  featureKey: keyof PlanPermissions;
  align?: 'left' | 'right';
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const data = FEATURE_DESCRIPTIONS[featureKey as string];
  if (!data) return null;

  return (
    <>
      <div
        className="relative inline-flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsOpen(true)}
      >
        {/* Gatilho Destacado */}
        <div className="cursor-pointer flex items-center justify-center w-4 h-4 rounded-full bg-gold/10 text-gold hover:bg-gold hover:text-white transition-all duration-200">
          <Info size={11} strokeWidth={3} />
        </div>

        {/* Mini Preview (Hover) */}
        {isHovered && !isOpen && (
          <div
            className={`absolute bottom-full mb-2 z-[100] w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150 ${align === 'left' ? 'left-0' : 'right-0'}`}
          >
            {data.previewUrl && (
              <div className="w-full aspect-video bg-slate-100">
                <img
                  src={data.previewUrl}
                  className="w-full h-full object-cover opacity-80"
                  alt=""
                />
              </div>
            )}
            <div className="p-2 bg-white">
              <p className="text-[10px] text-petroleum/60 italic leading-tight">
                Clique para detalhes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal (Full Overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-petroleum/40 animate-in fade-in duration-300">
          <div
            className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Mídia */}
            <div className="w-full aspect-video bg-slate-900 relative">
              {data.previewType === 'video' ? (
                <video
                  src={data.previewUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={data.previewUrl}
                  className="w-full h-full object-contain"
                  alt={data.label}
                />
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/20 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo Detalhado */}
            <div className="p-8 relative">
              <div className="absolute left-0 top-8 bottom-8 w-1.5 bg-gold rounded-r-full" />
              <h3 className="text-gold font-bold uppercase tracking-[0.2em] text-[11px] mb-2">
                Feature Deep Dive
              </h3>
              <h2 className="text-2xl font-semibold text-petroleum mb-4 italic">
                {data.label}
              </h2>
              <p className="text-petroleum/70 leading-relaxed text-sm">
                {data.description}
                {/* Aqui você pode expandir o plans.ts para ter um campo 'longDescription' se desejar */}
              </p>

              <button
                onClick={() => setIsOpen(false)}
                className="mt-8 px-6 py-2 bg-petroleum text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
          {/* Background click to close */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}
