'use client';
import React, { useState, useEffect } from 'react';
import {
  Camera,
  ChevronDown,
  Maximize2,
  MapPin,
  Calendar,
  ImageIcon,
  ChevronLeft, // Adicionado
  ChevronRight,
  ChevronUp, // Adicionado
} from 'lucide-react';
import PhotographerAvatar from './ProfileAvatar';
import { getInternalGoogleDriveUrl } from '@/core/utils/url-helper';
import { useSegment } from '@/hooks/useSegment';

interface GaleriaHeroProps {
  galeria: any;
  photos: any[];
  coverUrl: string | null;
}

export const GaleriaHero = ({
  galeria,
  photos,
  coverUrl,
}: GaleriaHeroProps) => {
  const { SegmentIcon } = useSegment();
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const carouselImages =
    galeria.cover_image_ids.length > 0
      ? galeria.cover_image_ids.map((id) =>
          getInternalGoogleDriveUrl(id, '2048'),
        )
      : ([coverUrl].filter(Boolean) as string[]);

  // Funções de navegação manual
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
      <div className="absolute inset-0 z-0">
        {carouselImages.map((img, index) => (
          <div
            key={img}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out
              ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundImage: `url('${img}')`,
              backgroundPosition: 'center 35%',
            }}
          />
        ))}
        {carouselImages.length === 0 && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black" />
        )}
      </div>

      {/* NAVEGAÇÃO MANUAL (Apenas quando expandido) */}
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
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[20] flex gap-2">
            {carouselImages.map((_, i) => (
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

      <div className="absolute inset-0 transition-opacity duration-1000 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-100 z-[2]" />

      <div
        className={`absolute top-4 right-4 md:top-6 md:right-8 transition-all duration-1000 z-[10] ${
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

      <div
        className={`relative h-full flex flex-col transition-all duration-[1200ms] max-w-[1600px] mx-auto w-full z-[5] justify-end ${
          isExpanded
            ? 'px-8 pb-20 md:pb-24 md:px-16'
            : 'px-4 pb-4 md:pb-6 md:px-6'
        }`}
      >
        <div
          className={`flex transition-all duration-1000 items-center gap-4 md:gap-8 w-full pointer-events-auto scale-100`}
        >
          <div className="flex flex-col items-start text-left transition-all duration-1000 min-w-0 flex-1">
            <div className="flex flex-col min-w-0 w-full">
              <h1
                className={`font-semibold text-white transition-all duration-1000 leading-tight tracking-luxury-normal break-words flex items-center gap-3 drop-shadow-[0_2px_8_rgba(0,0,0,0.8)]
                ${isExpanded ? 'text-2xl md:text-5xl mb-2' : 'text-xl md:text-4xl mb-1'}`}
              >
                <SegmentIcon
                  className={`text-champagne shrink-0 transition-all duration-1000 drop-shadow-md ${
                    isExpanded
                      ? 'w-8 h-8 md:w-12 md:h-12'
                      : 'w-6 h-6 md:w-8 md:h-8'
                  }`}
                  strokeWidth={1.5}
                />
                <span className="drop-shadow-lg">{galeria.title}</span>
              </h1>

              {/* LINHA DECORATIVA */}
              <div className="h-[2px] md:h-[3px] bg-champagne rounded-full mb-3 md:mb-4 w-full max-w-[150px] md:max-w-[300px] shadow-lg" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2 transition-all duration-1000 items-start justify-start opacity-90">
              {galeria.location && (
                <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                  <MapPin size={14} className="text-white" />
                  <span>{galeria.location}</span>
                </div>
              )}
              <div className="hidden md:block w-[1px] h-3 bg-white/40" />
              <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                <Calendar size={14} className="text-white" />
                <span>
                  {new Date(galeria.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="hidden md:block w-[1px] h-3 bg-white/40" />
              <div className="flex items-center text-white text-[10px] md:text-[14px] font-medium shrink-0 gap-1.5 drop-shadow-md">
                <ImageIcon
                  size={14}
                  className="text-champagne drop-shadow-sm"
                />
                <span>{photos?.length || 0} fotos</span>
              </div>
            </div>
          </div>
        </div>

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
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-4 right-6 flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/20 text-white/90 rounded-lg transition-all shadow-xl  hover:bg-black/80"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
