'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';

import { usePlan } from '@/core/context/PlanContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-fade';

interface EditorialHeroProps {
  title: string;
  coverUrls?: string | string[]; // Suporta string (legado) ou array
  sideElement?: React.ReactNode;
  children: React.ReactNode;
}

import { useSegment } from '@/hooks/useSegment';

const SEGMENT_ASSETS = {
  PHOTOGRAPHER: {
    path: '/heros/photographer/',
    count: 12,
  },
  EVENT: {
    path: '/heros/event/',
    count: 3,
  },
  OFFICE: {
    path: '/heros/office/',
    count: 2,
  },
  CAMPAIGN: {
    path: '/heros/campaign/',
    count: 2,
  },
};

export const EditorialHero = ({
  title,
  coverUrls = [],
  sideElement,
  children,
}: EditorialHeroProps) => {
  const { planKey, permissions } = usePlan();
  const { segment } = useSegment();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // 🛡️ 1. Lógica de Normalização e Seleção baseada no Plano
  const finalImages = useMemo(() => {
    // Normaliza para Array (trata o legado de string única)
    const normalizedUrls = Array.isArray(coverUrls)
      ? coverUrls
      : typeof coverUrls === 'string' && coverUrls
        ? [coverUrls]
        : [];

    if (planKey === 'FREE' || normalizedUrls.length === 0) {
      // 1. Busca configuração do segmento atual
      const config =
        SEGMENT_ASSETS[segment as keyof typeof SEGMENT_ASSETS] ||
        SEGMENT_ASSETS.PHOTOGRAPHER;

      // 2. Gera um número aleatório entre 1 e o total de fotos (count) baseado no título
      const seed = title ? title.length : Math.floor(Math.random() * 100);
      const index = (seed % config.count) + 1;

      // 3. Monta o caminho final (ex: /heros/campaign/2.webp)
      return [`${config.path}${index}.webp`];
    }

    // Usa o limite definido nas permissões do plano (CarouselLimit)
    const limit = permissions?.profileCarouselLimit || 1;
    return normalizedUrls.slice(0, limit);
  }, [coverUrls, planKey, title, permissions]);

  // Só ativa o carrossel se houver mais de uma imagem E o plano permitir
  const isCarousel =
    finalImages.length > 1 && (planKey === 'PRO' || planKey === 'PREMIUM');

  // Efeitos de Expansão (Scroll e Timer)
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

  // Força o carregamento para evitar tela preta em fallbacks
  useEffect(() => {
    if (finalImages.length > 0) {
      const img = new Image();
      img.src = finalImages[0];
      img.onload = () => setIsImageLoaded(true);
      img.onerror = () => setIsImageLoaded(true);
    }
  }, [finalImages]);

  return (
    <section
      className={`relative overflow-hidden transition-all duration-[1200ms] z-5 bg-black ${
        isExpanded ? 'h-screen' : 'h-[32vh] md:h-[45vh]'
      }`}
    >
      {/* 🖼️ BACKGROUND LAYER */}
      <div
        className={`absolute inset-0 transition-all duration-[2000ms] ease-out ${
          isImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
        }`}
      >
        {!isCarousel ? (
          <div
            className="w-full h-full bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundImage: `url('${finalImages[0]}')`,
              backgroundPosition: 'center 40%',
            }}
          />
        ) : (
          <Swiper
            modules={[Autoplay, EffectFade]}
            effect="fade"
            autoplay={{ delay: 6000, disableOnInteraction: false }}
            loop={true}
            speed={2000} // Transição suave entre as fotos
            className="w-full h-full"
          >
            {finalImages.map((url, i) => (
              <SwiperSlide key={i}>
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${url}')`,
                    backgroundPosition: 'center 40%',
                  }}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>

      {/* Overlay Dark Gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent md:bg-black/40" />

      {/* CONTEÚDO */}
      <div
        className={`relative h-full flex flex-col transition-all duration-[1200ms] max-w-[1600px] mx-auto w-full px-6 md:px-12 justify-end ${
          isExpanded ? 'pb-20 md:pb-24' : 'pb-6 md:pb-8'
        }`}
      >
        <div className="w-full">
          <div className="flex items-center gap-4 md:gap-6 mb-4">
            <div className="shrink-0">
              {React.isValidElement(sideElement)
                ? React.cloneElement(sideElement as React.ReactElement<any>, {
                    isExpanded,
                  })
                : sideElement}
            </div>

            <div className="flex flex-col items-start min-w-0">
              <h1
                className={`font-semibold text-white transition-all duration-1000 leading-tight tracking-luxury-tight ${
                  isExpanded ? 'text-3xl md:text-6xl' : 'text-2xl md:text-4xl'
                }`}
              >
                {title}
              </h1>
              <div className="h-[2px] md:h-[3px] bg-champagne rounded-full w-full mt-1" />
            </div>
          </div>

          <div
            className={`w-full transition-all duration-1000 delay-100 ${
              isExpanded ? 'opacity-100 translate-y-0' : 'opacity-90'
            }`}
          >
            <div className="max-w-3xl">
              {React.Children.map(children, (child) =>
                React.isValidElement(child)
                  ? React.cloneElement(child as React.ReactElement<any>, {
                      isExpanded,
                    })
                  : child,
              )}
            </div>
          </div>
        </div>

        {/* CONTROLES */}
        {isExpanded ? (
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-white/60 hover:text-champagne p-2"
          >
            <ChevronUp size={32} />
          </button>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-6 right-8 flex items-center justify-center bg-black/40 backdrop-blur-md text-white/90 rounded-lg border border-white/10 hover:bg-black/60 transition-all shadow-xl"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
