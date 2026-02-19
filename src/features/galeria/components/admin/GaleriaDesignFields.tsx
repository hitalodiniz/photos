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
import { PlanGuard } from '@/components/auth/PlanGuard';
import { PlanSelect } from '@/components/ui/PlanSelect';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
      {/* FOTO DE FUNDO / TOGGLE */}
      <PlanGuard feature="customizationLevel" label="Foto de fundo">
        <div className="flex items-center gap-2 border-r border-petroleum/10 pr-2.5 shrink-0 h-8">
          <div className="flex items-center gap-1 shrink-0">
            <label>
              <ImageIcon size={11} className="text-gold" /> Foto fundo
            </label>
            <InfoTooltip
              content="Usa a foto selecionada como fundo da grade de fotos da página
                  da galeria acessada pelo visitante."
              width="w-48"
            />
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
            <label>Cor fundo</label>
            <InfoTooltip
              content="Define a cor sólida do grid de fotos da página da galeria
                  acessada pelo visitante."
              width="w-48"
            />
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
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-[0.25rem] pl-1 pr-1.5 h-5.5 w-fit shrink-0 shadow-sm transition-all hover:border-slate-300">
              {/* Color Picker Wrapper */}
              <div
                className="w-3.5 h-3.5 rounded-[0.1rem] border border-slate-200 relative overflow-hidden shadow-inner shrink-0"
                style={{ backgroundColor }}
              >
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) =>
                    setBackgroundColor(e.target.value.toUpperCase())
                  }
                  className="absolute inset-0 opacity-0 cursor-pointer scale-[2]"
                />
              </div>

              {/* Hex Input - Exatamente o tamanho de 7 caracteres mono */}
              <input
                {...(register ? register : {})}
                type="text"
                maxLength={7}
                value={backgroundColor}
                onChange={(e) =>
                  setBackgroundColor(e.target.value.toUpperCase())
                }
                className="max-w-[9ch] !gap-0 !p-1 !h-8 rounded-luxury bg-transparent text-[9px] font-mono text-petroleum outline-none uppercase"
              />
            </div>
          </div>
        </div>
      </PlanGuard>

      {/* GRID COLUNAS */}

      <div className="flex items-center gap-2 shrink-0 h-8">
        <div className="flex items-center gap-1 shrink-0">
          <Layout size={12} className="text-gold" />
          <label>Grid</label>
          <InfoTooltip
            content="Colunas por dispositivo: Mobile | Tablet | Desktop."
            width="w-48"
          />
        </div>

        <div className="flex items-center gap-1 h-full">
          {[
            {
              k: 'mobile' as const,
              i: Smartphone,
              options: getFilteredOptions([1, 2]),
            },
            { k: 'tablet' as const, i: Tablet, options: [2, 3, 4, 5, 6] },
            { k: 'desktop' as const, i: Monitor, options: [3, 4, 5, 6, 8] },
          ].map((d) => (
            <div
              key={d.k}
              className="flex items-center gap-1 bg-slate-50 border border-petroleum/20  px-1 rounded-[0.25rem] h-6"
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
