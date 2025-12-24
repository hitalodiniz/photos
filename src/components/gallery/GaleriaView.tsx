'use client';
import React, { useState, useEffect } from 'react';
import { PhotoGrid, PhotographerAvatar } from '@/components/gallery';
import type { Galeria } from '@/types/galeria';

interface GaleriaViewProps {
  galeria: Galeria;
  photos: any[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getCoverUrl = (fileId: string) => {
    if (!fileId) return '/hero-bg.jpg';
    // Correção da interpolação com backticks para o ID real
    return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
  };

  // Efeito de transição para o Champanhe: atinge 100% aos 400px de scroll
  const opacity = Math.min(scrollY / 400, 1);

  return (
    /* Cor de fundo base alterada para Champanhe Perolado (#FDF8E7) */

    <div className="relative min-h-screen font-sans bg-[#FFF">

      {/* 1. BACKGROUND DINÂMICO FIXO */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundPosition: 'center 35%',
            backgroundImage: `url('${getCoverUrl(galeria.cover_image_url)}')`,
            transform: `scale(${1 + scrollY * 0.0003})`,
          }}
        />
        {/* Camada que transiciona da transparência para o Champanhe Perolado */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundColor: '#FDF8E7',
            opacity: opacity
          }}
        />
      </div>

      {/* 2. CONTEÚDO DA PÁGINA */}
      <div className="relative z-10">

        {/* HEADER REDUZIDO (40vh) */}
        <header className="relative h-[40vh] md:h-[45vh] flex items-center justify-center">
          <div className="text-center px-4 w-full max-w-6xl">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white italic leading-tight drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] px-2"
              style={{
                fontFamily: "'Playfair Display', serif",
                opacity: 1 - (scrollY / 300)
              }}
            >
              {galeria.title}
            </h1>
          </div>
        </header>

        {/* MAIN CONTENT (Grid de Fotos) */}
        <main className="relative z-30 isolate w-full max-w-[1600px] mx-auto px-4 md:px-8 pb-10 mt-4 flex justify-center">
          <div className="w-full">
            {photos && photos.length > 0 ? (
              <PhotoGrid photos={photos} galeria={galeria} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-[#D4AF37]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mb-6"></div>
                <p className="font-serif italic text-xl tracking-wide">Preparando sua experiência...</p>
              </div>
            )}
          </div>
        </main>

        {/* 3. RODAPÉ EDITORIAL */}
        <footer className="relative z-20 w-full pt-6 pb-16 px-6 border-t border-[#D4AF37]/60 bg-[#FFF9F0] backdrop-blur-sm">

          <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">

            {/* Botão Voltar ao Topo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group flex flex-col items-center gap-2 text-[#D4AF37] transition-all hover:text-slate-900"
            >
              <div className="p-3 rounded-full border border-[#D4AF37]/30 group-hover:bg-[#D4AF37] group-hover:text-[#FDF8E7] transition-all duration-500 shadow-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Voltar ao Topo</span>
            </button>

            {/* Informações Finais */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-px w-20 bg-[#D4AF37]/30" />
              <h3 className="font-serif italic text-base md:text-4xl text-slate-900">
                {galeria.title}
              </h3>
              <p className="text-slate-500 text-xs md:text-[14px] tracking-wider max-w-md leading-relaxed">
                Todas as imagens são de propriedade de <span className="text-[#D4AF37] font-semibold">{galeria.photographer_name}</span>.
              </p>
              <p className="text-slate-500 text-xs md:text-[14px] tracking-wider max-w-md leading-relaxed">
                A reprodução não autorizada é proibida.
              </p>
            </div>
            <div className="text-[10px] md:text-[14px] tracking-widest text-slate-400 ">
              Powered by Sua Galeria de Fotos•  <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div >
      <div className="lightbox-parent-container">
      <PhotographerAvatar galeria={galeria} position="top-page" />
      </div>
    </div >
  );
}