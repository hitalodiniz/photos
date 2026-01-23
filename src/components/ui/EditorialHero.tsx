'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { RESOLUTIONS } from '@/core/utils/url-helper';

interface EditorialHeroProps {
  title: string;
  coverUrl?: string; // Agora opcional (pode ser ID do Drive ou URL)
  sideElement?: React.ReactNode;
  children: React.ReactNode;
}

// Lista de imagens padrão
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
  coverUrl,
  sideElement,
  children,
}: EditorialHeroProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // 🎯 Lógica Inteligente de Imagem:
  // Se for um ID do Google Drive, resolve via hook.
  // Se já for uma URL (começa com http, / ou blob:), usa direto.
  const isDriveId = useMemo(() => 
    !!coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('/') && !coverUrl.startsWith('blob:'), 
  [coverUrl]);

  const { 
    imgSrc: resolvedUrl, 
    isLoaded: isImageLoaded,
    handleLoad,
    handleError,
    imgRef
  } = useGoogleDriveImage({
    photoId: isDriveId ? coverUrl! : '',
    width: RESOLUTIONS.DESKTOP_VIEW,
    priority: true,
    fallbackToProxy: true,
  });

  const [directLoaded, setDirectLoaded] = useState(false);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);

  // Callback ref para detectar se a imagem já está no cache (evita linter error de setState em useEffect)
  const setDirectImgRef = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && !isDriveId) {
      setDirectLoaded(true);
    }
  }, [isDriveId]);

  const finalCoverUrl = useMemo(() => {
    // 1. Se resolveu via Drive e temos a URL, usa ela
    if (isDriveId && resolvedUrl) return resolvedUrl;
    // 2. Se for URL direta (http, / ou blob:), usa ela
    if (coverUrl && (coverUrl.startsWith('http') || coverUrl.startsWith('/') || coverUrl.startsWith('blob:'))) return coverUrl;
    // 3. Fallback: Sorteia uma padrão baseada no título para ser consistente
    const index = title ? (title.length % DEFAULT_HEROS.length) : 0;
    return DEFAULT_HEROS[index];
  }, [coverUrl, isDriveId, resolvedUrl, title]);

  // Reset do loading quando a URL final muda
  if (prevUrl !== finalCoverUrl) {
    setPrevUrl(finalCoverUrl);
    setDirectLoaded(false);
  }

  // Se for Drive, confiamos no hook. Se for direto ou fallback, usamos o estado local.
  const isActuallyLoaded = isDriveId ? isImageLoaded : directLoaded;

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
      {/* IMAGEM DE FUNDO COM LÓGICA DE CARREGAMENTO */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-out
          ${isActuallyLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
        style={{
          backgroundImage: `url('${finalCoverUrl}')`,
          backgroundPosition: 'center 40%',
        }}
      />

      {/* 🎯 TAG OCULTA: Essencial para monitorar o carregamento */}
      {finalCoverUrl && (
        <img
          ref={isDriveId ? imgRef : setDirectImgRef}
          src={finalCoverUrl}
          alt=""
          className="absolute opacity-0 pointer-events-none w-px h-px -left-[9999px]"
          onLoad={(e) => {
            if (isDriveId) handleLoad(e);
            else setDirectLoaded(true);
          }}
          onError={isDriveId ? handleError : undefined}
        />
      )}

      {/* Camada de escurecimento para leitura (Pura e sutil) */}
      <div className="absolute inset-0 bg-black/40" />

      <div
        className={`relative h-full flex flex-col transition-all duration-[1200ms] max-w-[1600px] mx-auto w-full 
          ${
            isExpanded
              ? 'justify-end pb-20 md:pb-24 px-6 md:px-12 items-start'
              : 'justify-end pb-6 md:pb-8 px-6 md:px-12 items-start'
          }`}
      >
        <div className="w-full">
          {/* LINHA SUPERIOR: AVATAR + NOME */}
          <div className="flex items-center gap-4 md:gap-6 mb-4">
            <div className="shrink-0">
              {React.isValidElement(sideElement)
                ? React.cloneElement(sideElement as React.ReactElement<{ isExpanded: boolean }>, { isExpanded })
                : sideElement}
            </div>

            <div className="flex flex-col items-start min-w-0">
              <h1
                className={`font-artistic font-semibold text-white transition-all duration-1000 drop-shadow-lg leading-tight tracking-tight
                ${isExpanded ? 'text-3xl md:text-6xl' : 'text-2xl md:text-4xl'}`}
              >
                {title}
              </h1>
              <div className="h-[2px] md:h-[3px] bg-[#F3E5AB] rounded-full shadow-lg w-full mt-1" />
            </div>
          </div>

          {/* LINHA INFERIOR: BIOGRAFIA */}
          <div
            className={`w-full transition-all duration-1000 delay-100 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-90'}`}
          >
            <div className="max-w-3xl">
              {React.Children.map(children, (child) =>
                React.isValidElement(child)
                  ? React.cloneElement(child as React.ReactElement<{ isExpanded: boolean }>, { isExpanded })
                  : child,
              )}
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        {isExpanded ? (
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-white/60 hover:text-[#F3E5AB] p-2"
          >
            <ChevronDown size={32} />
          </button>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-9 h-9 md:w-12 md:h-12 absolute bottom-6 right-8 flex items-center justify-center bg-black/40 backdrop-blur-md text-white/90 rounded-lg shadow-xl border border-white/10 active:scale-95 hover:bg-black/60 transition-all"
          >
            <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </section>
  );
};
