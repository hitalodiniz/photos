'use client';

import React, { useState } from 'react';
import {
  Layout,
  Palette,
  Image as ImageIcon,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import { usePlan } from '@/core/context/PlanContext';
import { PERMISSIONS_BY_PLAN } from '@/core/config/plans';
import { PlanGuard } from '@/components/auth/PlanGuard';
import UpgradeModal from '@/components/ui/UpgradeModal';
import { PlanSelect } from '@/components/ui/PlanSelect';

interface GalleryDesignFieldsProps {
  showBackgroundPhoto: boolean;
  setShowBackgroundPhoto: (val: boolean) => void;
  backgroundColor: string;
  setBackgroundColor: (val: string) => void;
  columns: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  setColumns: (columns: {
    mobile: number;
    tablet: number;
    desktop: number;
  }) => void;
  onBackgroundPhotoUrlChange?: (url: string) => void;
  register?: any; // Para integração opcional com react-hook-form
}

export const GalleryDesignFields: React.FC<GalleryDesignFieldsProps> = ({
  showBackgroundPhoto,
  setShowBackgroundPhoto,
  backgroundColor,
  setBackgroundColor,
  columns,
  setColumns,
  register,
}) => {
  const { planKey } = usePlan();

  const getFilteredOptions = (originalOptions: number[]) => {
    if (planKey === 'FREE') {
      return [originalOptions[0]];
    }
    return originalOptions;
  };
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      {/* FOTO DE FUNDO / TOGGLE */}
      <PlanGuard feature="customizationLevel" label="Foto de fundo">
        <div className="flex items-center gap-2 border-r border-petroleum/10 pr-2.5 shrink-0 h-8">
          <div className="flex items-center gap-1 shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum flex items-center gap-1">
              <ImageIcon size={11} className="text-gold" /> Foto de fundo
            </label>
            <div className="group relative flex items-center">
              <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-200 text-petroleum/60 dark:text-slate-400 group-hover:border-gold transition-colors cursor-help">
                <span className="text-[10px] font-semibold">?</span>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-50 text-center border border-white/10">
                <p>Usa a foto selecionada como fundo da grade.</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-slate-900" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBackgroundPhoto(!showBackgroundPhoto)}
            className="relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: showBackgroundPhoto
                ? 'var(--color-gold, #D4AF37)'
                : '#e2e8f0',
            }}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${showBackgroundPhoto ? 'translate-x-3.5' : ''}`}
            />
          </button>
        </div>
      </PlanGuard>

      {/* COR DE FUNDO */}

      <PlanGuard feature="customizationLevel" label="Cor de fundo">
        <div className="flex items-center gap-2 border-r border-petroleum/10 shrink-0 h-8 pr-2.5">
          <div className="flex items-center gap-1 shrink-0">
            <Palette size={12} className="text-gold" />
            <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
              Cor de fundo
            </label>
            <div className="group relative flex items-center">
              <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-200 text-petroleum/60 dark:text-slate-400 group-hover:border-gold transition-colors cursor-help">
                <span className="text-[8px] font-semibold">?</span>
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-white text-[9px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-center border border-white/10">
                <p>Define a cor sólida do grid.</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-slate-900" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 h-full">
            <div className="flex gap-0.5 shrink-0">
              {['#F3E5AB', '#FFFFFF', '#000000'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBackgroundColor(c)}
                  className={`w-4 h-4 rounded-[0.15rem] border transition-all ${backgroundColor === c ? 'border-gold scale-110 shadow-sm' : 'border-slate-200'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-[0.25rem] px-1 h-5.5 shrink-0">
              <div
                className="w-3 h-3 rounded-[0.1rem] border border-slate-200 relative overflow-hidden shadow-sm shrink-0"
                style={{ backgroundColor }}
              >
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) =>
                    setBackgroundColor(e.target.value.toUpperCase())
                  }
                  className="absolute inset-0 opacity-0 cursor-pointer scale-150"
                />
              </div>
              <input
                {...(register ? register : {})}
                type="text"
                maxLength={7}
                value={backgroundColor}
                onChange={(e) =>
                  setBackgroundColor(e.target.value.toUpperCase())
                }
                className="w-9 h-5 bg-transparent text-[9px] font-mono font-bold text-petroleum outline-none uppercase"
              />
            </div>
          </div>
        </div>
      </PlanGuard>

      {/* GRID COLUNAS */}

      <div className="flex items-center gap-2 shrink-0 h-8">
        <div className="flex items-center gap-1 shrink-0">
          <Layout size={12} className="text-gold" />
          <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
            Grid
          </label>
          <div className="group relative flex items-center">
            <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-200 text-petroleum/60 dark:text-slate-400 group-hover:border-gold transition-colors cursor-help">
              <span className="text-[8px] font-semibold">?</span>
            </div>
            <div className="absolute bottom-full right-0 xl:left-1/2 xl:-translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-white text-[9px] font-medium leading-relaxed rounded-luxury opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 shadow-2xl z-[100] text-left xl:text-center border border-white/10">
              <p>Colunas por dispositivo.</p>
              <div className="absolute top-full right-2 xl:left-1/2 xl:-translate-x-1/2 border-6 border-transparent border-t-slate-900" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 h-full">
          {[
            {
              k: 'mobile' as const,
              i: Smartphone,
              options: getFilteredOptions([1, 2, 3, 4]),
            },
            { k: 'tablet' as const, i: Tablet, options: [2, 3, 4, 5, 6] },
            { k: 'desktop' as const, i: Monitor, options: [3, 4, 5, 6, 8] },
          ].map((d) => (
            <div
              key={d.k}
              className="flex items-center gap-1.5 bg-slate-50 border border-petroleum/20 px-1 rounded-[0.25rem] h-5"
            >
              <d.i size={11} className="text-petroleum/60" strokeWidth={2} />
              <PlanSelect
                feature="maxGridColumns"
                options={d.options}
                value={columns[d.k]}
                onChange={(e) =>
                  setColumns({ ...columns, [d.k]: Number(e.target.value) })
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
