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
        isExpanded ? 'h-screen' : 'h-[25vh] md:h-[40vh]'
      }`}
    >
      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[3000ms] ease-out"
        style={{
          backgroundImage: `url('${coverUrl}')`,
          backgroundPosition: 'center 40%',
          transform: isExpanded ? 'scale(1.1)' : 'scale(1)',
        }}
      />

      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 transition-opacity duration-1000 ${isExpanded ? 'opacity-100' : 'opacity-80'}`}
      />

      <div
        className={`absolute top-4 right-4 md:top-6 md:right-8 z-15 transition-all duration-1000 ${
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

      <div
        className={`relative h-full flex flex-col px-1 md:px-10 transition-all duration-[1200ms] ${
          isExpanded
            ? 'justify-end pb-20 md:pb-24 items-start text-left'
            : 'justify-center items-start text-left'
        }`}
      >
        <div
          className={`flex transition-all duration-1000 items-center gap-4 md:gap-6 ${
            isExpanded
              ? 'flex-row scale-100 md:scale-110'
              : 'flex-row scale-90 md:scale-95'
          } `}
        >
          {/* ÍCONE DA CÂMERA */}
          <div
            className={`md:w-16 md:h-16 flex items-center justify-center border border-[#F3E5AB]/60 rounded-full bg-black/40 backdrop-blur-md transition-all duration-1000 shrink-0 shadow-2xl ${
              isExpanded
                ? 'w-14 h-14 ' // Tamanho reduzido (estava 16/20)
                : 'w-10 h-10' // Tamanho compacto (estava 12/16)
            }`}
          >
            <Camera className="text-[#F3E5AB] w-1/2 h-1/2" />
          </div>

          {/* TÍTULO E METADADOS */}
          <div className="flex flex-col items-start text-left transition-all duration-1000">
            <div className="flex flex-col min-w-0">
              <h1
                className={`font-artistic font-semibold text-white transition-all duration-1000 drop-shadow-md leading-tight tracking-tight
                ${isExpanded ? 'text-3xl md:text-6xl mb-2' : 'text-xl md:text-5xl mb-1'}`}
              >
                {galeria.title}
              </h1>

              <div className="h-[2px] md:h-[4px] bg-gradient-to-r from-[#F3E5AB] to-transparent rounded-full mb-4 w-full max-w-[600px]" />
            </div>

            {/* DADOS */}
            <div className="flex flex-col md:flex-row md:items-center gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 transition-all duration-1000 items-start justify-start">
              {galeria.location && (
                <div className="flex items-center text-white text-[11px] md:text-[14px] font-medium shrink-0 gap-1.5">
                  <MapPin size={14} className="text-[#F3E5AB]" />
                  <span className="rounded-sm">{galeria.location}</span>
                </div>
              )}

              <div className="hidden md:block w-[1px] h-3 bg-white/30 shrink-0" />

              <div className="flex items-center text-white text-[11px] md:text-[14px] font-medium shrink-0 gap-1.5">
                <Calendar size={14} className="text-[#F3E5AB]" />
                <span className="rounded-sm">
                  {new Date(galeria.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="hidden md:block w-[1px] h-3 bg-white/30 shrink-0" />

              <div className="flex items-center text-white text-[11px] md:text-[14px] font-medium shrink-0 gap-1.5">
                <ImageIcon size={14} className="text-[#F3E5AB]" />
                <span className="rounded-sm">{photos?.length || 0} fotos</span>
              </div>
            </div>
          </div>
        </div>

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
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-4 right-4 md:right-6 flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/20 text-white/90 rounded-lg transition-all shadow-xl active:scale-95"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
