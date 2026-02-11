'use client';

import React from 'react';
import { Heart, PlayCircle } from 'lucide-react';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface GalleryInteractionFieldsProps {
  enableFavorites: boolean;
  setEnableFavorites: (value: boolean) => void;
  enableSlideshow: boolean;
  setEnableSlideshow: (value: boolean) => void;
}

export const GalleryInteractionFields = ({
  enableFavorites,
  setEnableFavorites,
  enableSlideshow,
  setEnableSlideshow,
}: GalleryInteractionFieldsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* FAVORITOS */}
      <PlanGuard feature="canFavorite" label="Sistema de Favoritos">
        <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-12">
          <div className="flex items-center gap-2">
            <Heart
              size={14}
              className={`transition-colors ${enableFavorites ? 'text-gold' : 'text-petroleum/40'}`}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              Favoritos
            </span>
            <InfoTooltip content="Permite que o visitante selecione fotos favoritas." />
          </div>

          {/* Toggle Switch Visual */}
          <button
            type="button"
            onClick={() => setEnableFavorites(!enableFavorites)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enableFavorites ? 'bg-gold' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enableFavorites ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          {/* 🎯 IMPORTANTE: Input oculto para o FormData da Server Action */}
          <input
            type="hidden"
            name="enable_favorites"
            value={String(enableFavorites)}
          />
        </div>
      </PlanGuard>

      {/* SLIDESHOW */}
      <PlanGuard feature="canShowSlideshow" label="Modo Slideshow">
        <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-12">
          <div className="flex items-center gap-2">
            <PlayCircle
              size={14}
              className={`transition-colors ${enableSlideshow ? 'text-gold' : 'text-petroleum/40'}`}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
              Slideshow
            </span>
            <InfoTooltip content="Apresentação automática de fotos em tela cheia." />
          </div>

          {/* Toggle Switch Visual */}
          <button
            type="button"
            onClick={() => setEnableSlideshow(!enableSlideshow)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enableSlideshow ? 'bg-gold' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enableSlideshow ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          {/* 🎯 IMPORTANTE: Input oculto para o FormData da Server Action */}
          <input
            type="hidden"
            name="enable_slideshow"
            value={String(enableSlideshow)}
          />
        </div>
      </PlanGuard>
    </div>
  );
};
