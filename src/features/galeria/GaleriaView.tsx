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
    // 🎯 O Portal de Acesso agora é gerenciado pelo servidor (GaleriaBasePage)
    // para garantir segurança total.
    setIsLoading(false);
  }, [galeria.id]);

  // 🎯 ESTRATÉGIA DE FALLBACK: Usa hook useGoogleDriveImage que já implementa fallback
  // Usa constantes RESOLUTIONS para manter consistência
  const coverResolution = isMobile
    ? RESOLUTIONS.MOBILE_VIEW // 1280px
    : RESOLUTIONS.DESKTOP_VIEW; // 1920px

// 2. Chama o Hook para a capa
const { 
  imgSrc: coverUrl, 
  handleLoad, 
  handleError,
  isLoading: isCoverLoading // Renomeado para não conflitar com o loading da página
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
{/* 🎯 TAG OCULTA: Essencial para o hook monitorar o erro/sucesso do Google */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          className="hidden"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
        <GaleriaFooter
          photographer={galeria.photographer}
          title={galeria.title}
        />
      </div>
    </div>
  );
}
