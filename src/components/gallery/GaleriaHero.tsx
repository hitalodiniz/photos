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
      className={`relative overflow-hidden transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] bg-black ${
        isExpanded ? 'h-screen' : 'h-[28vh] md:h-[40vh]'
      }`}
    >
      {/* BACKGROUND COM FILTRO DE CONTRASTE */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[3000ms] ease-out"
        style={{
          backgroundImage: `url('${coverUrl}')`,
          backgroundPosition: 'center 35%',
        }}
      />

      {/* OVERLAY DE PROTEÇÃO (GRADIENTE EDITORIAL) */}
      {/* Este gradiente garante que fotos claras não 'atropelem' o texto branco. 
          Ele é mais forte quando expandido e mais sutil quando recolhido.
      */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100}`}
      />

      {/* AVATAR DO FOTÓGRAFO */}
      <div
        className={`absolute top-4 right-4 md:top-6 md:right-8 transition-all duration-1000 hero-avatar-container z-[10] ${
          isExpanded
            ? 'opacity-0 pointer-events-none'
            : 'opacity-100 pointer-events-auto'
        }`}
        style={{ visibility: isExpanded ? 'hidden' : 'visible' }}
      >
        <PhotographerAvatar
          galeria={galeria}
          position="top-page"
          isVisible={!isExpanded}
        />
      </div>

      {/* CONTAINER PRINCIPAL DE CONTEÚDO */}
      <div
        className={` relative h-full flex flex-col transition-all duration-[1200ms] max-w-[1600px] mx-auto w-full z-0 justify-end ${
          isExpanded
            ? 'px-8 pb-20 md:pb-24 md:px-16' // Espaço maior quando em tela cheia
            : 'px-4 pb-4 md:pb-6 md:px-6' // Alinhado ao bottom, mas com respiro menor quando recolhido
        }`}
      >
        <div
          className={`flex transition-all duration-1000 items-center gap-4 md:gap-8 w-full pointer-events-auto ${
            isExpanded ? 'scale-100 md:scale-105' : 'scale-95 md:scale-100'
          }`}
        >
          {/* TÍTULO E METADADOS */}
          <div className="flex flex-col items-start text-left transition-all duration-1000 min-w-0 flex-1">
            <div className="flex flex-col min-w-0 w-full">
              <h1
                className={`font-artistic font-semibold text-white transition-all duration-1000 leading-tight tracking-tight break-words flex items-center gap-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]
                ${isExpanded ? 'text-2xl md:text-5xl mb-2' : 'text-xl md:text-4xl mb-1'}`}
              >
                <Camera
                  className={`text-[#F3E5AB] shrink-0 transition-all duration-1000 drop-shadow-md ${
                    isExpanded
                      ? 'w-8 h-8 md:w-12 md:h-12'
                      : 'w-6 h-6 md:w-8 md:h-8'
                  }`}
                  strokeWidth={1.5}
                />
                <span className="drop-shadow-lg">{galeria.title}</span>
              </h1>

              {/* LINHA CHAMPANHE FORTE */}
              <div className="h-[2px] md:h-[3px] bg-[#F3E5AB] rounded-full mb-3 md:mb-4 w-full max-w-[150px] md:max-w-[300px] shadow-lg" />
            </div>

            {/* DADOS DA GALERIA COM SOMBRA REFORÇADA */}
            <div className="flex flex-col md:flex-row md:items-center gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 transition-all duration-1000 items-start justify-start">
              {galeria.location && (
                <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                  <MapPin size={14} className="text-[#F3E5AB] drop-shadow-sm" />
                  <span>{galeria.location}</span>
                </div>
              )}

              <div className="hidden md:block w-[1px] h-3 bg-white/40 shrink-0" />

              <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                <Calendar size={14} className="text-[#F3E5AB] drop-shadow-sm" />
                <span>
                  {new Date(galeria.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="hidden md:block w-[1px] h-3 bg-white/40 shrink-0" />

              <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                <ImageIcon
                  size={14}
                  className="text-[#F3E5AB] drop-shadow-sm"
                />
                <span>{photos?.length || 0} fotos</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÕES DE NAVEGAÇÃO INTERNA */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            // 🎯 fixed e bottom-2 para colar no limite inferior. animate-bounce para o efeito quicando.
            className="fixed bottom-2 left-1/2 -translate-x-1/2 animate-bounce group z-[400] pointer-events-auto p-2"
          >
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-500 hover:bg-black/60">
              {/* Brilho interno ao passar o mouse */}
              <div className="absolute inset-0 rounded-full bg-[#F3E5AB]/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <ChevronDown
                size={28}
                strokeWidth={1.5}
                className="text-white transition-colors group-hover:text-[#F3E5AB]"
              />
            </div>
          </button>
        )}

        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-4 right-6 flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/20 text-white/90 rounded-lg transition-all shadow-xl active:scale-95 hover:bg-black/80"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
