'use client';
import React, { useState, useEffect } from 'react';
import { PhotoGrid, PhotographerAvatar } from '@/components/gallery';
import type { Galeria } from '@/core/types/galeria';
import { Camera } from 'lucide-react';
import LoadingScreen from '../ui/LoadingScreen';
import GaleriaFooter from './GaleriaFooter';
import { getImageUrl } from '@/core/utils/url-helper';

interface GaleriaViewProps {
  galeria: Galeria;
  photos: any[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  const [scrollY, setScrollY] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Extraímos as preferências de exibição da galeria
  const showCover = galeria.show_cover_in_grid ?? true;
  const bgColor = galeria.grid_bg_color ?? '#F9F5F0';

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });

    if (photos && photos.length > 0) {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, [photos]);

  const getCoverUrl = (fileId: string) => {
    if (!fileId) return '/hero-bg.jpg';
    return getImageUrl(fileId, 'w1600');
  };

  // Defina uma constante para identificar se o fundo atual é o modo escuro
  const isDarkBg = galeria.grid_bg_color === '#0F172A';

  return (
    // Aplicamos a cor de fundo dinâmica aqui no container principal
    <div
      className="relative min-h-screen font-sans"
      style={{ backgroundColor: bgColor }}
    >
      <LoadingScreen fadeOut={!isLoading} message="Carregando fotos" />

      {/* 1. BACKGROUND DINÂMICO FIXO (Condicional) */}
      {showCover ? (
        <div className="fixed inset-0 z-0 bg-[#0A0A0A]">
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundPosition: 'center 40%',
              backgroundImage: `url('${getCoverUrl(galeria.cover_image_url)}')`,
              filter: 'brightness(0.6) scale(1.05)',
            }}
          />
          {/* Overlay de luxo para manter legibilidade das fotos sobre a capa */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/85 to-[#F3E5AB]/10 backdrop-blur-[3px]" />
        </div>
      ) : (
        // Se a foto estiver desativada, o fundo sólido definido em bgColor já preenche a tela
        <div
          className="fixed inset-0 z-0"
          style={{ backgroundColor: bgColor }}
        />
      )}

      {/* 2. CONTEÚDO DA PÁGINA */}
      <div
        className={`relative z-10 transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* HEADER: Ajustado para ficar legível em fundos claros ou escuros */}
        <header className="relative min-h-[10vh] md:h-[20vh] flex items-center pt-6 pb-4 md:pt-10">
          <div className="relative w-full max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
            <div className="flex flex-col gap-2 text-left items-center md:items-start w-full">
              <div className="inline-block relative">
                <div className="flex items-center gap-3 md:gap-5 mb-1.5 md:mb-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 md:w-14 md:h-14 border border-[#F3E5AB]/60 rounded-full bg-black/30 backdrop-blur-md shadow-xl">
                    <Camera className="text-[#F3E5AB] w-4 h-4 md:w-8 md:h-8" />
                  </div>
                  <h1
                    className={`text-2xl md:text-4xl lg:text-5xl font-bold italic leading-none drop-shadow-lg ${
                      // Se tiver capa OU se o fundo for a cor escura, o texto deve ser claro
                      showCover || isDarkBg ? 'text-white' : 'text-slate-800'
                    }`}
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {galeria.title}
                  </h1>
                </div>

                <div className="h-[3px] md:h-1.5 w-full bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] rounded-full shadow-md" />
              </div>
            </div>

            <div className="flex-shrink-0 hidden md:flex">
              <PhotographerAvatar
                galeria={galeria}
                position="top-page"
                isVisible={scrollY < 300}
              />
            </div>
          </div>
        </header>

        {/* MAIN CONTENT: PhotoGrid agora recebe as colunas dinâmicas internamente */}
        <main className="relative z-30 isolate w-full max-w-[1600px] mx-auto px-4 md:px-8 mt-2 md:mt-4 flex justify-center">
          <div className="w-full">
            {photos && photos.length > 0 ? (
              <PhotoGrid photos={photos} galeria={galeria} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mb-6"></div>
                <p
                  className={`font-serif italic text-xl tracking-wide ${showCover ? 'text-[#D4AF37]' : 'text-slate-500'}`}
                >
                  Nenhuma foto encontrada nesta galeria.
                </p>
              </div>
            )}
          </div>
        </main>
        <GaleriaFooter galeria={galeria} />
      </div>
    </div>
  );
}
