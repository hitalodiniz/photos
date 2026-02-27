'use client';
import React, { useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import GaleriaFooter from './GaleriaFooter';
import { RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { GaleriaHero } from './GaleriaHero';
import PhotoGrid from './PhotoGrid';
import { useIsMobile } from '@/hooks/use-breakpoint';
import LoadingScreen from '@/components/ui/LoadingScreen';
// FIX 1: PlanProvider REMOVIDO deste componente.
// GaleriaView já é renderizado dentro de um <PlanProvider> em GaleriaBasePage.
// Ter um segundo <PlanProvider> sem props aqui sobrescrevia o context externo
// com as permissões FREE, fazendo todos os usePlan() filhos lerem o plano errado.

interface GaleriaViewProps {
  galeria: Galeria;
  photos: unknown[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  const isMobile = useIsMobile();
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

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
    <div
      className="relative min-h-screen font-sans"
      style={{ backgroundColor: bgColor }}
    >
      <LoadingScreen
        message="Preparando sua galeria..."
        fadeOut={!isPageLoading}
      />

      {/* 1. BACKGROUND LAYER */}
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
        coverUrl={coverUrl}
        photos={photos}
        isCoverLoading={isCoverLoading}
      />

      {/* 2. CONTENT LAYER */}
      <div className="relative z-10 transition-opacity duration-1000 opacity-100">
        <main className="relative z-30 mx-auto">
          {photos?.length > 0 ? (
            <PhotoGrid photos={photos} galeria={galeria} />
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
