'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, Maximize2 } from 'lucide-react';

import { usePlan } from '@/core/context/PlanContext';
import { useSegment } from '@/hooks/useSegment';

interface EditorialHeroProps {
  title: string;
  coverUrls?: string | string[]; // Suporta string (legado) ou array
  sideElement?: React.ReactNode;
  children: React.ReactNode;
}

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesOrientation, setImagesOrientation] = useState<
    Record<string, 'portrait' | 'landscape'>
  >({});

  // 🛡️ 1. Lógica de Normalização e Seleção baseada no Plano
  const finalImages = useMemo(() => {
    const normalizedUrls = Array.isArray(coverUrls)
      ? coverUrls
      : typeof coverUrls === 'string' && coverUrls
        ? [coverUrls]
        : [];

    if (planKey === 'FREE' || normalizedUrls.length === 0) {
      const config =
        SEGMENT_ASSETS[segment as keyof typeof SEGMENT_ASSETS] ||
        SEGMENT_ASSETS.PHOTOGRAPHER;
      const seed = title ? title.length : Math.floor(Math.random() * 100);
      const index = (seed % config.count) + 1;
      return [`${config.path}${index}.webp`];
    }

    const limit = permissions?.profileCarouselLimit || 1;
    return normalizedUrls.slice(0, limit);
  }, [coverUrls, planKey, title, permissions]);

  // Detecção de orientação das imagens (igual GaleriaHero)
  useEffect(() => {
    finalImages.forEach((img) => {
      if (imagesOrientation[img]) return;
      const imageLoader = new Image();
      imageLoader.src = img;
      imageLoader.onload = () => {
        const orientation =
          imageLoader.height > imageLoader.width ? 'portrait' : 'landscape';
        setImagesOrientation((prev) => ({ ...prev, [img]: orientation }));
      };
    });
  }, [finalImages]);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % finalImages.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? finalImages.length - 1 : prev - 1,
    );
  };

  // Autoplay do carrossel (igual GaleriaHero)
  useEffect(() => {
    if (!isExpanded || finalImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % finalImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isExpanded, finalImages.length]);

  // Fechamento automático e scroll (igual GaleriaHero)
  useEffect(() => {
    const totalTime = Math.max(finalImages.length * 3000, 5000);
    const timer = setTimeout(() => setIsExpanded(false), totalTime);
    return () => clearTimeout(timer);
  }, [finalImages.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50 && isExpanded) setIsExpanded(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

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
      {/* 🖼️ BACKGROUND LAYER (navegação igual GaleriaHero) */}
      <div
        className={`absolute inset-0 z-0 transition-all duration-[2000ms] ease-out ${
          isImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
        }`}
      >
        {finalImages.map((img, index) => {
          const orientation = imagesOrientation[img];
          const isPortrait = orientation === 'portrait';

          const getPosition = () => {
            if (isPortrait) return 'center 10%';
            return isExpanded ? 'center 35%' : 'center center';
          };

          return (
            <div
              key={img}
              className={`absolute inset-0 bg-cover transition-opacity duration-1000 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url('${img}')`,
                backgroundPosition: getPosition(),
              }}
            />
          );
        })}
        {finalImages.length === 0 && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black" />
        )}
      </div>

      {/* NAVEGAÇÃO MANUAL (quando expandido e mais de uma imagem) */}
      {isExpanded && finalImages.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-[20] p-2 rounded-full bg-black/20 text-white hover:bg-black/50 transition-all"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-[20] p-2 rounded-full bg-black/20 text-white hover:bg-black/50 transition-all"
          >
            <ChevronRight size={32} />
          </button>
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[20] flex gap-2">
            {finalImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'w-8 bg-champagne' : 'w-2 bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}

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
                  isExpanded
                    ? 'text-2xl md:text-5xl mb-2'
                    : 'text-xl md:text-4xl mb-1'
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
            <div className="max-w-7xl">
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

        {/* CONTROLES (igual GaleriaHero) */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 animate-bounce group z-[400] p-2"
          >
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-500 hover:bg-black/60">
              <ChevronUp
                size={28}
                strokeWidth={1.5}
                className="text-white transition-colors group-hover:text-champagne"
              />
            </div>
          </button>
        )}

        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-6 right-8 flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/20 text-white/90 rounded-lg transition-all shadow-xl hover:bg-black/80"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
