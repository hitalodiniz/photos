'use client';

import React from 'react';
import { Heart, PlayCircle } from 'lucide-react';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { HELP_CONTENT } from '@/core/config/help-content';
import { usePlan } from '@/core/context/PlanContext';

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
  const { permissions } = usePlan();
  const planAllowsFavorites = permissions.canFavorite === true;
  const planAllowsSlideshow = permissions.canShowSlideshow === true;

  /** Efeito “ligado” só se o plano permitir (ignora valor gravado quando o plano bloqueia). */
  const favoritesOn = planAllowsFavorites && enableFavorites;
  const slideshowOn = planAllowsSlideshow && enableSlideshow;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* FAVORITOS */}

      <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-12">
        <div className="flex items-center gap-2">
          <Heart
            size={14}
            className={`transition-colors ${favoritesOn ? 'text-gold' : 'text-petroleum/40'}`}
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
        >
          <button
            type="button"
            disabled={!planAllowsFavorites}
            onClick={() => {
              if (planAllowsFavorites) setEnableFavorites(!enableFavorites);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              favoritesOn ? 'bg-gold' : 'bg-slate-200'
            } ${!planAllowsFavorites ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                favoritesOn ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </PlanGuard>
      </div>

      {/* SLIDESHOW */}
      <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-luxury border border-petroleum/10 h-12">
        <div className="flex items-center gap-2">
          <PlayCircle
            size={14}
            className={`transition-colors ${slideshowOn ? 'text-gold' : 'text-petroleum/40'}`}
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
        >
          <button
            type="button"
            disabled={!planAllowsSlideshow}
            onClick={() => {
              if (planAllowsSlideshow) setEnableSlideshow(!enableSlideshow);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              slideshowOn ? 'bg-gold' : 'bg-slate-200'
            } ${!planAllowsSlideshow ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                slideshowOn ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </PlanGuard>
      </div>
    </div>
  );
};
