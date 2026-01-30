'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { RESOLUTIONS } from '@/core/utils/url-helper';
import { usePlan } from '@/hooks/usePlan';
import { handleError } from '@supabase/auth-js/dist/module/lib/fetch';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-fade';

interface EditorialHeroProps {
  title: string;
  coverUrls?: string[]; // Alterado para array para suportar carrossel
  sideElement?: React.ReactNode;
  children: React.ReactNode;
}

const DEFAULT_HEROS = [
  '/hero-bg-1.webp',
  '/hero-bg-2.webp',
  '/hero-bg-3.webp',
  '/hero-bg-4.webp',
  '/hero-bg-5.webp',
  '/hero-bg-6.webp',
  '/hero-bg-7.webp',
  '/hero-bg-8.webp',
  '/hero-bg-9.webp',
  '/hero-bg-10.webp',
  '/hero-bg-11.webp',
  '/hero-bg-12.webp',
];

export const EditorialHero = ({
  title,
  coverUrls = [],
  sideElement,
  children,
}: EditorialHeroProps) => {
  const { planKey } = usePlan();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // 🛡️ 1. Lógica de Seleção de Imagens baseada no Plano
  const finalImages = useMemo(() => {
    // REGRA FREE: Sempre aleatório do app
    if (planKey === 'FREE' || coverUrls.length === 0) {
      const index = title ? title.length % DEFAULT_HEROS.length : 0;
      return [DEFAULT_HEROS[index]];
    }

    // REGRA PRO/PREMIUM: Carrossel (Limite de 3 ou 5)
    if (planKey === 'PREMIUM') return coverUrls.slice(0, 5);
    if (planKey === 'PRO') return coverUrls.slice(0, 3);

    // REGRA START/PLUS: Imagem única
    return [coverUrls[0]];
  }, [coverUrls, planKey, title]);

  const isCarousel =
    finalImages.length > 1 && (planKey === 'PRO' || planKey === 'PREMIUM');

  useEffect(() => {
    const timer = setTimeout(() => setIsExpanded(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50 && isExpanded) setIsExpanded(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

return (
    <section
      className={`relative overflow-hidden transition-all duration-[1200ms] z-5 bg-black ${
        isExpanded ? 'h-screen' : 'h-[32vh] md:h-[45vh]'
      }`}
    >
      {/* 🖼️ BACKGROUND: IMAGEM ÚNICA OU CARROSSEL */}
      <div className={`absolute inset-0 transition-all duration-[2000ms] ease-out ${isImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
        {!isCarousel ? (
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url('${finalImages[0]}')`, backgroundPosition: 'center 40%' }}
          >
            {/* Monitor de carregamento para imagem única */}
            <img 
              src={finalImages[0]} 
              className="hidden" 
              onLoad={() => setIsImageLoaded(true)} 
              alt=""
            />
          </div>
        ) : (
          <Swiper
            modules={[Autoplay, EffectFade]}
            effect="fade"
            autoplay={{ delay: 6000 }}
            loop={true}
            className="w-full h-full"
            onSwiper={() => setIsImageLoaded(true)}
          >
            {finalImages.map((url, i) => (
              <SwiperSlide key={i}>
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${url}')`, backgroundPosition: 'center 40%' }}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>

      <div className="absolute inset-0 bg-black/40" />

      {/* CONTEÚDO (Avatar, Nome, Bio) */}
      <div className={`relative h-full flex flex-col transition-all duration-[1200ms] max-w-[1600px] mx-auto w-full px-6 md:px-12 justify-end ${isExpanded ? 'pb-20 md:pb-24' : 'pb-6 md:pb-8'}`}>
        <div className="w-full">
          <div className="flex items-center gap-4 md:gap-6 mb-4">
            <div className="shrink-0">
              {React.isValidElement(sideElement)
                ? React.cloneElement(sideElement as React.ReactElement<any>, { isExpanded })
                : sideElement}
            </div>

            <div className="flex flex-col items-start min-w-0">
              <h1 className={`font-artistic font-semibold text-white transition-all duration-1000 leading-tight tracking-tight ${isExpanded ? 'text-3xl md:text-6xl' : 'text-2xl md:text-4xl'}`}>
                {title}
              </h1>
              <div className="h-[2px] md:h-[3px] bg-[#F3E5AB] rounded-full w-full mt-1" />
            </div>
          </div>

          <div className={`w-full transition-all duration-1000 delay-100 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-90'}`}>
            <div className="max-w-3xl">
              {React.Children.map(children, (child) =>
                React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, { isExpanded }) : child
              )}
            </div>
          </div>
        </div>

        {/* CONTROLES DE EXPANSÃO */}
        {isExpanded ? (
          <button onClick={() => setIsExpanded(false)} className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-white/60 hover:text-[#F3E5AB] p-2">
            <ChevronDown size={32} />
          </button>
        ) : (
          <button onClick={() => setIsExpanded(true)} className="w-9 h-9 md:w-12 md:h-12 absolute bottom-6 right-8 flex items-center justify-center bg-black/40 backdrop-blur-md text-white/90 rounded-lg border border-white/10 hover:bg-black/60 transition-all">
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
};
