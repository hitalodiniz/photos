'use client';
import React, { useState, useEffect } from 'react';
import { PhotoGrid, PhotographerAvatar } from '@/components/gallery';
import type { Galeria } from '@/types/galeria';
import { Camera } from 'lucide-react';

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
    return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
  };

  // Efeito de transição para o Champanhe: atinge 100% aos 400px de scroll
  const opacity = Math.min(scrollY / 400, 1);

  return (
    <div className="relative min-h-screen font-sans bg-[#F9F5F0]">
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
      <div className="relative z-10">
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mb-6"></div>
                <p className="font-serif italic text-xl tracking-wide">
                  Preparando sua experiência...
                </p>
              </div>
            )}
          </div>
        </main>

        {/* 3. RODAPÉ EDITORIAL */}
        <footer className="relative z-20 w-full mt-16 clear-both pt-10 pb-20 px-6 border-t border-[#D4AF37]/30 bg-[#FFF9F0] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-10">
            {/* Botão Voltar ao Topo - Estilo Medalhão */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group flex flex-col items-center gap-3 text-[#D4AF37] transition-all"
            >
              <div className="p-4 rounded-full border border-[#D4AF37]/40 group-hover:bg-[#D4AF37] group-hover:text-white transition-all duration-700 shadow-[0_0_15px_rgba(212,175,55,0.2)] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] relative overflow-hidden">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative z-10"
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </div>
              <span className="text-[9px] md:text-[14px] tracking-[0.4em] font-semibold opacity-70 group-hover:opacity-100 transition-opacity">
                Voltar ao Topo
              </span>
            </button>

            {/* Informações Finais - Layout Editorial */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

              <div className="space-y-2">
                <h3 className="font-serif italic text-2xl md:text-4xl text-slate-900 tracking-tight">
                  {galeria.title}
                </h3>
                <p className="text-[10px] md:text-[12px] uppercase tracking-[0.3em] text-[#D4AF37] font-medium">
                  Memórias Eternizadas
                </p>
              </div>

              <div className="space-y-1 max-w-md">
                <p className="text-slate-500 text-xs md:text-sm tracking-wide leading-relaxed">
                  Fotografias capturadas por{' '}
                  <span className="text-slate-900 font-bold border-b border-[#D4AF37]/30">
                    {galeria.photographer_name}
                  </span>
                </p>
                <p className="text-slate-400 text-[10px] md:text-xs italic">
                  Direitos Autorais Reservados • A reprodução não autorizada é
                  protegida por lei.
                </p>
              </div>
            </div>

            {/* Branding Final */}
            <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200/50 w-full max-w-xs">
              <div className="text-[9px] md:text-[11px] tracking-[0.2em] text-slate-400 uppercase font-medium">
                Powered by <span className="text-slate-600">Sua Galeria</span>
              </div>
              <span className="text-[10px] text-slate-300 font-serif">
                © {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
