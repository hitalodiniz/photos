'use client';
import React, { useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import LoadingScreen from '@/components/ui/LoadingScreen';
import GaleriaFooter from './GaleriaFooter';
import { RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { GaleriaHero } from './GaleriaHero';
import PhotoGrid from './PhotoGrid';
import { useIsMobile } from '@/hooks/use-breakpoint';

interface GaleriaViewProps {
  galeria: Galeria;
  photos: unknown[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  const showCover = galeria.show_cover_in_grid ?? true;
  const bgColor = galeria.grid_bg_color ?? '#F9F5F0';

  useEffect(() => {
    if (photos?.length > 0) {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [photos]);

  // 🎯 ESTRATÉGIA DE FALLBACK: Usa hook useGoogleDriveImage que já implementa fallback
  // Usa constantes RESOLUTIONS para manter consistência
  const coverResolution = isMobile
    ? RESOLUTIONS.MOBILE_VIEW // 1280px
    : RESOLUTIONS.DESKTOP_VIEW; // 1920px

  const { imgSrc: coverUrl } = useGoogleDriveImage({
    photoId: galeria.cover_image_url || '',
    width: coverResolution,
    priority: true, // Prioridade alta para LCP
    fallbackToProxy: true,
  });

  return (
    <div
      className="relative min-h-screen font-sans"
      style={{ backgroundColor: bgColor }}
    >
      <LoadingScreen fadeOut={!isLoading} message="Carregando fotos" />

      {/* 1. BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {showCover ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 brightness-[0.6] scale-[1.05]"
              style={{
                backgroundImage: coverUrl ? `url('${coverUrl}')` : 'none',
                backgroundPosition: 'center 40%',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/85 to-[#F3E5AB]/10 backdrop-blur-[3px]" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: bgColor }}
          />
        )}
      </div>

      <GaleriaHero galeria={galeria} coverUrl={coverUrl} photos={photos} />

      {/* 2. CONTENT LAYER */}
      <div
        className={`relative z-10 transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* MAIN GRID */}
        <main className="relative z-30 max-w-[1600px] mx-auto">
          {photos?.length > 0 ? (
            <PhotoGrid photos={photos} galeria={galeria} />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mb-6" />
              <p
                className={`italic text-xl ${showCover ? 'text-[#D4AF37]' : 'text-slate-500'}`}
              >
                Nenhuma foto encontrada nesta galeria.
              </p>
            </div>
          )}
        </main>

        <GaleriaFooter
          photographer={galeria.photographer}
          title={galeria.title}
        />
      </div>
    </div>
  );
}
