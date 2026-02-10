'use client';

import React from 'react';
import { Heart, PlayCircle } from 'lucide-react';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface GalleryInteractionFieldsProps {
  register: any; // Integrado com react-hook-form do GaleriaFormContent
}

export const GalleryInteractionFields = ({ register }: { register: any }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* FAVORITOS: START ou superior */}
      <PlanGuard feature="canFavorite" label="Sistema de Favoritos">
        <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-12">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              Favoritos
            </span>
            <InfoTooltip content="Permite que o visitante selecione fotos favoritas." />
          </div>
          <input
            type="checkbox"
            {...register('enable_favorites')}
            className="apple-switch"
          />
        </div>
      </PlanGuard>

      {/* SLIDESHOW: PRO ou superior */}
      <PlanGuard feature="canShowSlideshow" label="Modo Slideshow">
        <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-12">
          <div className="flex items-center gap-2">
            <PlayCircle size={14} className="text-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              Slideshow
            </span>
            <InfoTooltip content="Apresentação automática de fotos." />
          </div>
          <input
            type="checkbox"
            {...register('enable_slideshow')}
            className="apple-switch"
          />
        </div>
      </PlanGuard>
    </div>
  );
};
