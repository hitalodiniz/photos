'use client';

import React from 'react';
import { Heart, PlayCircle } from 'lucide-react';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { HELP_CONTENT } from '@/core/config/help-content';

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

      <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-12">
        <div className="flex items-center gap-2">
          <Heart
            size={14}
            className={`transition-colors ${enableFavorites ? 'text-gold' : 'text-petroleum/40'}`}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
            Favoritos
          </span>
          <InfoTooltip
            title={HELP_CONTENT.INTERACTION.FAVORITES.title}
            content={HELP_CONTENT.INTERACTION.FAVORITES.content}
          />
        </div>
        <PlanGuard
          feature="canFavorite"
          label="Sistema de Favoritos"
          variant="mini"
          scenarioType="feature"
          forceShowLock={true}
        >
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

          {/* Input oculto para FormData da Server Action */}
          <input
            type="hidden"
            name="enable_favorites"
            value={String(enableFavorites)}
          />
        </PlanGuard>
      </div>

      {/* SLIDESHOW */}
      <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-12">
        <div className="flex items-center gap-2">
          <PlayCircle
            size={14}
            className={`transition-colors ${enableSlideshow ? 'text-gold' : 'text-petroleum/40'}`}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-petroleum">
            Slideshow
          </span>
          <InfoTooltip
            title={HELP_CONTENT.INTERACTION.SLIDESHOW.title}
            content={HELP_CONTENT.INTERACTION.SLIDESHOW.content}
          />
        </div>
        <PlanGuard
          feature="canShowSlideshow"
          label="Modo Slideshow"
          variant="mini"
          scenarioType="feature"
          forceShowLock={true}
        >
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

          {/* Input oculto para FormData da Server Action */}
          <input
            type="hidden"
            name="enable_slideshow"
            value={String(enableSlideshow)}
          />
        </PlanGuard>
      </div>
    </div>
  );
};
