'use client';
import React, { useState, useEffect } from 'react';
import {
  Camera,
  ChevronDown,
  Maximize2,
  MapPin,
  Calendar,
  ImageIcon,
} from 'lucide-react';
import PhotographerAvatar from './PhotographerAvatar';

export const GaleriaHero = ({ galeria, photos, coverUrl }: any) => {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsExpanded(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50 && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  return (
    <section
      className={`relative overflow-hidden transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] z-5 ${
        isExpanded ? 'h-screen' : 'h-[28vh] md:h-[40vh]'
      }`}
    >
      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[3000ms] ease-out"
        style={{
          backgroundImage: `url('${coverUrl}')`,
          backgroundPosition: 'center 40%',
        }}
      />

      {/* AVATAR DO FOTÓGRAFO */}
      <div
        className={`absolute top-4 right-4 md:top-6 md:right-8 z-20 transition-all duration-1000 hero-avatar-container ${
          isExpanded
            ? 'opacity-0 scale-75 pointer-events-none'
            : 'opacity-100 scale-100'
        }`}
      >
        <PhotographerAvatar
          galeria={galeria}
          position="top-page"
          isVisible={!isExpanded}
        />
      </div>

      {/* CONTAINER PRINCIPAL DE CONTEÚDO */}
      <div
        className={`relative h-full flex flex-col transition-all duration-[1200ms] px-6 md:px-12 max-w-[1600px] mx-auto w-full ${
          isExpanded
            ? 'justify-end pb-20 md:pb-24 items-start'
            : 'justify-center items-start'
        }`}
      >
        <div
          className={`flex transition-all duration-1000 items-center gap-4 md:gap-8 w-full ${
            isExpanded ? 'scale-100 md:scale-105' : 'scale-95 md:scale-100'
          }`}
        >
          {/* ÍCONE DA CÂMERA - REDUZIDO E FIXO */}
          <div
            className={`flex items-center justify-center border border-[#F3E5AB]/60 rounded-full bg-black/40 backdrop-blur-md transition-all duration-1000 shrink-0 shadow-2xl ${
              isExpanded
                ? 'w-14 h-14 md:w-16 md:h-16'
                : 'w-10 h-10 md:w-12 md:h-12'
            }`}
          >
            <Camera className="text-[#F3E5AB] w-1/2 h-1/2" />
          </div>

          {/* TÍTULO E METADADOS - PROTEGIDOS PARA NÃO VAZAR */}
          <div className="flex flex-col items-start text-left transition-all duration-1000 min-w-0 flex-1">
            <div className="flex flex-col min-w-0 w-full">
              <h1
                className={`font-artistic font-semibold text-white transition-all duration-1000 drop-shadow-md leading-tight tracking-tight break-words
                ${isExpanded ? 'text-2xl md:text-6xl mb-2' : 'text-xl md:text-4xl mb-1'}`}
              >
                {galeria.title}
              </h1>

              {/* LINHA CHAMPANHE FORTE (SÓLIDA) */}
              <div className="h-[2px] md:h-[3px] bg-[#F3E5AB] rounded-full mb-3 md:mb-4 w-full max-w-[150px] md:max-w-[300px]" />
            </div>

            {/* DADOS DA GALERIA */}
            <div className="flex flex-col md:flex-row md:items-center gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 transition-all duration-1000 items-start justify-start opacity-90">
              {galeria.location && (
                <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5">
                  <MapPin size={14} className="text-[#F3E5AB]" />
                  <span>{galeria.location}</span>
                </div>
              )}

              <div className="hidden md:block w-[1px] h-3 bg-white/30 shrink-0" />

              <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5">
                <Calendar size={14} className="text-[#F3E5AB]" />
                <span>
                  {new Date(galeria.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="hidden md:block w-[1px] h-3 bg-white/30 shrink-0" />

              <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5">
                <ImageIcon size={14} className="text-[#F3E5AB]" />
                <span>{photos?.length || 0} fotos</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÕES DE NAVEGAÇÃO INTERNA */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-white/60 hover:text-[#F3E5AB] p-2"
          >
            <ChevronDown size={32} className="md:w-10 md:h-10" />
          </button>
        )}

        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-4 right-6 flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/20 text-white/90 rounded-lg transition-all shadow-xl active:scale-95"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
