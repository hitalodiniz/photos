'use client';
import React, { useState, useEffect, useRef } from 'react';
import type { Galeria } from '@/core/types/galeria';
import GaleriaFooter from './GaleriaFooter';
import { RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { GaleriaHero } from './GaleriaHero';
import PhotoGrid from './PhotoGrid';
import { useIsMobile } from '@/hooks/use-breakpoint';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface GaleriaViewProps {
  galeria: Galeria;
  photos: unknown[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  const isMobile = useIsMobile();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isHeroExpanded, setIsHeroExpanded] = useState(true);
  const systemThemeForRestoreRef = useRef<string | null>(null);

  // Resolve o tema da galeria uma vez, estável
  const galleryTheme =
    galeria?.theme_key && String(galeria.theme_key).trim() !== ''
      ? galeria.theme_key
      : 'PHOTOGRAPHER';

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  /*
    Aplica o tema no <html> para que a navbar global e outros elementos
    fora da árvore deste componente também recebam o tema correto.
    O data-theme no wrapper div abaixo garante SSR/hydration corretos
    para os elementos dentro deste componente.
  */
  useEffect(() => {
    if (systemThemeForRestoreRef.current === null) {
      systemThemeForRestoreRef.current =
        document.documentElement.getAttribute('data-theme');
    }
    document.documentElement.setAttribute('data-theme', galleryTheme);

    return () => {
      const toRestore = systemThemeForRestoreRef.current;
      if (toRestore !== null && toRestore !== undefined) {
        document.documentElement.setAttribute('data-theme', toRestore);
      } else {
        const fallback =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem('debug-theme') || 'PHOTOGRAPHER'
            : 'PHOTOGRAPHER';
        document.documentElement.setAttribute('data-theme', fallback);
      }
      systemThemeForRestoreRef.current = null;
    };
  }, [galleryTheme]);

  const showCover = galeria.show_cover_in_grid ?? true;
  const bgColor = galeria.grid_bg_color ?? '#F9F5F0';

  const coverResolution = isMobile
    ? RESOLUTIONS.VIEW_MOBILE
    : RESOLUTIONS.VIEW_DESKTOP;

  const {
    imgSrc: coverUrl,
    handleLoad,
    handleError,
    isLoading: isCoverLoading,
    imgRef,
  } = useGoogleDriveImage({
    photoId: galeria.cover_image_url || '',
    width: coverResolution,
    priority: true,
    fallbackToProxy: true,
  });

  return (
    /*
      data-theme no wrapper garante que GaleriaHero, toolbars e footer
      recebam as variáveis CSS corretas desde a renderização inicial (SSR/hydration),
      sem depender do useEffect acima que só roda no cliente.
    */
    <div
      className="relative min-h-screen font-sans"
      style={{ backgroundColor: bgColor }}
      data-theme={galleryTheme}
    >
      <LoadingScreen
        message="Preparando sua galeria..."
        fadeOut={!isPageLoading}
      />

      {/* BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {showCover ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 brightness-[0.6] scale-[1.05]"
              style={{
                backgroundImage: coverUrl ? `url('${coverUrl}')` : 'none',
                backgroundPosition: 'center 40%',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/60 to-transparent backdrop-blur-[2px]" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: bgColor }}
          />
        )}
      </div>

      <GaleriaHero
        galeria={galeria}
        photos={photos}
        coverUrl={coverUrl}
        themeKey={galleryTheme}
        onExpandedChange={setIsHeroExpanded}
      />

      {/* CONTENT LAYER */}
      <div className="relative z-10 transition-opacity duration-1000 opacity-100">
        <main className="relative z-30 mx-auto">
          {photos?.length > 0 ? (
            <PhotoGrid
              photos={photos}
              galeria={galeria}
              canStartTour={!isHeroExpanded}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p
                className={`italic text-xl ${showCover ? 'text-gold' : 'text-slate-500'}`}
              >
                Nenhuma foto encontrada nesta galeria.
              </p>
            </div>
          )}
        </main>
        {coverUrl && (
          <img
            ref={imgRef}
            src={coverUrl}
            alt=""
            className="hidden"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
        <GaleriaFooter
          galeria={galeria}
          photographer={galeria.photographer}
          title={galeria.title}
        />
      </div>
    </div>
  );
}
