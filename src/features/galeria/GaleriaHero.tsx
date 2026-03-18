'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Maximize2,
  MapPin,
  Calendar,
  ImageIcon,
  Video,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import PhotographerAvatar from './ProfileAvatar';
import { getInternalGoogleDriveUrl } from '@/core/utils/url-helper';
import { useSegment } from '@/hooks/useSegment';

interface GaleriaHeroProps {
  galeria: any;
  photos: any[];
  coverUrl: string | null;
  /** Tema visual da galeria — aplicado via data-theme para ativar as variáveis CSS do tema */
  themeKey?: string;
}

export const GaleriaHero = ({
  galeria,
  photos,
  coverUrl,
  themeKey,
}: GaleriaHeroProps) => {
  const { SegmentIcon } = useSegment();
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesOrientation, setImagesOrientation] = useState<
    Record<string, 'portrait' | 'landscape'>
  >({});

  // Resolve themeKey da prop ou do galeria.theme_key
  const resolvedTheme =
    themeKey ||
    (galeria?.theme_key && String(galeria.theme_key).trim() !== ''
      ? galeria.theme_key
      : undefined);

  const carouselImages =
    galeria.cover_image_ids?.length > 0
      ? galeria.cover_image_ids.map((id: string) =>
          getInternalGoogleDriveUrl(id, '2048'),
        )
      : ([coverUrl].filter(Boolean) as string[]);

  useEffect(() => {
    carouselImages.forEach((img: string) => {
      if (imagesOrientation[img]) return;
      const imageLoader = new window.Image();
      imageLoader.src = img;
      imageLoader.onload = () => {
        const orientation =
          imageLoader.height > imageLoader.width ? 'portrait' : 'landscape';
        setImagesOrientation((prev) => ({ ...prev, [img]: orientation }));
      };
    });
  }, [carouselImages]);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? carouselImages.length - 1 : prev - 1,
    );
  };

  useEffect(() => {
    if (!isExpanded || carouselImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isExpanded, carouselImages.length, currentImageIndex]);

  useEffect(() => {
    const totalTime = Math.max(carouselImages.length * 3000, 5000);
    const timer = setTimeout(() => setIsExpanded(false), totalTime);
    return () => clearTimeout(timer);
  }, [carouselImages.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50 && isExpanded) setIsExpanded(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  const { photoCount, videoCount } = useMemo(() => {
    const list = photos ?? [];
    let photosN = 0;
    let videosN = 0;
    list.forEach((p: any) => {
      if (p?.type === 'video' || p?.mimeType?.startsWith?.('video/')) {
        videosN++;
      } else {
        photosN++;
      }
    });
    return { photoCount: photosN, videoCount: videosN };
  }, [photos]);

  return (
    <section
      className={`relative overflow-hidden transition-all duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] bg-black ${
        isExpanded ? 'h-screen' : 'h-[28vh] md:h-[40vh]'
      }`}
      {...(resolvedTheme ? { 'data-theme': resolvedTheme } : {})}
    >
      {/* BACKGROUND CAROUSEL */}
      <div className="absolute inset-0 z-0">
        {carouselImages.map((img: string, index: number) => {
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
        {carouselImages.length === 0 && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black" />
        )}
      </div>

      {/* NAVEGAÇÃO MANUAL */}
      {isExpanded && carouselImages.length > 1 && (
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
          {/* Dots — usa champagne do tema via variável CSS */}
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[20] flex gap-2">
            {carouselImages.map((_: string, i: number) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentImageIndex
                    ? 'w-8 pub-hero-accent-bg'
                    : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* OVERLAY GRADIENT */}
      <div className="absolute inset-0 transition-opacity duration-1000 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-100 z-[2]" />

      {/* AVATAR — só exibe quando hero está colapsado */}
      <div
        className={`absolute top-4 right-4 md:top-6 md:right-6 transition-all duration-1000 z-[10] ${
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

      {/* CONTEÚDO */}
      <div
        className={`relative h-full flex flex-col transition-all duration-[1200ms] max-w-[1600px] mx-auto w-full z-[5] justify-end ${
          isExpanded
            ? 'px-8 pb-20 md:pb-24 md:px-16'
            : 'px-4 pb-4 md:pb-6 md:px-6'
        }`}
      >
        <div className="flex transition-all duration-1000 items-center gap-4 md:gap-8 w-full pointer-events-auto scale-100">
          <div className="flex flex-col items-start text-left transition-all duration-1000 min-w-0 flex-1">
            <div className="flex flex-col min-w-0 w-full">
              {/* TÍTULO — usa text-champagne que resolve via --color-champagne do tema */}
              <h1
                className={`font-artistic font-semibold text-white transition-all duration-1000 leading-tight tracking-normal break-words flex items-center gap-3
                  ${isExpanded ? 'text-2xl md:text-5xl mb-2' : 'text-xl md:text-4xl mb-1'}
                  drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]`}
              >
                <SegmentIcon
                  className={`pub-hero-accent shrink-0 transition-all duration-1000 drop-shadow-md ${
                    isExpanded
                      ? 'w-8 h-8 md:w-12 md:h-12'
                      : 'w-6 h-6 md:w-8 md:h-8'
                  }`}
                  strokeWidth={1.5}
                />
                <span className="drop-shadow-lg">{galeria.title}</span>
              </h1>

              {/* LINHA DECORATIVA */}
              <div className="h-[2px] md:h-[3px] pub-hero-accent-bg rounded-full mb-3 md:mb-4 w-full max-w-[150px] md:max-w-[300px] shadow-lg" />
            </div>

            {/* METADADOS — ícones text-champagne resolvem via tema */}
            <div className="flex flex-col md:flex-row md:items-center gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 transition-all duration-1000 items-start justify-start opacity-90">
              {galeria.location && (
                <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                  <MapPin
                    size={14}
                    className="pub-hero-accent drop-shadow-sm"
                  />
                  <span>{galeria.location}</span>
                </div>
              )}
              <div className="hidden md:block w-[1px] h-3 bg-white/40 shrink-0" />
              <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                <Calendar
                  size={14}
                  className="pub-hero-accent drop-shadow-sm"
                />
                <span>
                  {new Date(galeria.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="hidden md:block w-[1px] h-3 bg-white/40 shrink-0" />
              {(photoCount > 0 || videoCount > 0) && (
                <>
                  {photoCount > 0 && (
                    <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                      <ImageIcon
                        size={14}
                        className="pub-hero-accent drop-shadow-sm"
                      />
                      <span>
                        {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
                      </span>
                    </div>
                  )}
                  {photoCount > 0 && videoCount > 0 && (
                    <div className="hidden md:block w-[1px] h-3 bg-white/40 shrink-0" />
                  )}
                  {videoCount > 0 && (
                    <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                      <Video
                        size={14}
                        className="pub-hero-accent drop-shadow-sm"
                      />
                      <span>
                        {videoCount} {videoCount === 1 ? 'vídeo' : 'vídeos'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* BOTÃO COLLAPSE */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 animate-bounce group z-[400] p-2"
          >
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-500 hover:bg-black/60">
              <ChevronUp
                size={28}
                strokeWidth={1.5}
                className="text-white transition-colors group-hover:pub-hero-accent"
              />
            </div>
          </button>
        )}

        {/* BOTÃO EXPAND */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-4 right-6 flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/20 text-white/90 rounded-lg transition-all shadow-xl hover:bg-black/80"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
