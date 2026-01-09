'use client';
import React, { useState, useEffect } from 'react';
import { PhotoGrid, PhotographerAvatar } from '@/components/gallery';
import type { Galeria } from '@/core/types/galeria';
import { Camera } from 'lucide-react';
import LoadingScreen from '../ui/LoadingScreen';
import GaleriaFooter from './GaleriaFooter';

interface GaleriaViewProps {
  galeria: Galeria;
  photos: any[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  const [scrollY, setScrollY] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Estado de loading local

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Simula ou aguarda o carregamento inicial das fotos
    if (photos && photos.length > 0) {
      // Pequeno delay para garantir que o layout Masonry se calcule sem "pulos"
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, [photos]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getCoverUrl = (fileId: string) => {
    if (!fileId) return '/hero-bg.jpg';
    // Correção da interpolação com backticks para o ID real
    return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
  };

  return (
    <div className="relative min-h-screen font-sans bg-[#F9F5F0]">
      {/* 0. LOADING SCREEN EXPLÍCITO */}
      {/* O fadeOut=true apenas quando isLoading for false para suavizar a saída */}
      <LoadingScreen fadeOut={!isLoading} message="Carregando fotos" />
      {/* 1. BACKGROUND DINÂMICO FIXO */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundPosition: 'center 50%',
            backgroundImage: `url('${getCoverUrl(galeria.cover_image_url)}')`,
            filter: 'brightness(0.6) contrast(1)',
          }}
        />
      </div>

      {/* 2. CONTEÚDO DA PÁGINA */}

      <div
        className={`relative z-10 transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* HEADER AJUSTADO PARA MOBILE: h-auto e flex-col */}
        <header className="relative min-h-[10vh] md:h-[20vh] flex items-center pt-6 pb-4 md:pt-10">
          <div className="relative w-full max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
            {/* BLOCO ESQUERDO: TITULO */}
            <div className="flex flex-col gap-2 text-left items-center md:items-start w-full">
              <div className="inline-block relative">
                {/* CONJUNTO CÂMARA + TÍTULO */}
                <div className="flex items-center gap-3 md:gap-5 mb-1.5 md:mb-3">
                  {/* Ícone da Câmara ajustado para mobile e desktop */}
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 md:w-14 md:h-14 border border-[#F3E5AB]/60 rounded-full bg-black/30 backdrop-blur-md shadow-xl">
                    <Camera className="text-[#F3E5AB] w-4 h-4 md:w-8 md:h-8" />
                  </div>

                  <h1
                    className="text-2xl md:text-4xl lg:text-5xl font-bold text-white italic leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {galeria.title}
                  </h1>
                </div>

                {/* BARRA DOURADA OTIMIZADA: Mais fina no mobile e proporcional no desktop */}
                <div className="h-[3px] md:h-1.5 w-full bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] rounded-full shadow-[0_2px_10px_rgba(212,175,55,0.4)]" />
              </div>
            </div>

            {/* BLOCO DIREITO: AVATAR - Ajustado margem mobile */}
            <div className="flex-shrink-0 hidden md:flex">
              <PhotographerAvatar
                galeria={galeria}
                position="top-page"
                isVisible={scrollY < 300}
              />
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="relative z-30 isolate w-full max-w-[1600px] mx-auto px-4 md:px-8 mt-2 md:mt-4 flex justify-center">
          <div className="w-full">
            {photos && photos.length > 0 ? (
              <PhotoGrid photos={photos} galeria={galeria} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-[#D4AF37]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold mb-6"></div>
                <p className="font-serif italic text-xl tracking-wide">
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
