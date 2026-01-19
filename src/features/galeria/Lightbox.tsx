'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { GaleriaHeader } from './GaleriaHeader';
import PhotographerAvatar from './PhotographerAvatar';
import { getDirectGoogleUrl, RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import type { Galeria } from '@/core/types/galeria';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ToolbarGalleryView } from './ToolbarGalleryView';
import { useIsMobile } from '@/hooks/use-breakpoint';

interface Photo {
  id: string | number;
}

interface LightboxProps {
  photos: Photo[];
  activeIndex: number;
  totalPhotos: number;
  galleryTitle: string;
  location: string;
  galeria: Galeria;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  isSingleView?: boolean; // Se true, esconde setas e gestos
}

export default function Lightbox({
  photos,
  activeIndex,
  totalPhotos,
  galleryTitle,
  location,
  galeria,
  onClose,
  onNext,
  onPrev,
  favorites,
  onToggleFavorite,
  isSingleView,
}: LightboxProps) {
  const [showInterface, setShowInterface] = useState(true);
  const [imageSize, setImageSize] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Estados para Navegação por Gesto (Swipe)
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Handlers de Touch
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) =>
    setTouchEnd(e.targetTouches[0].clientX);

  // Desativar gestos de touch se for visão única
  const onTouchEnd = () => {
    if (isSingleView || !touchStart || !touchEnd) return; // 🎯 TRAVA AQUI
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) onNext();
    else if (distance < -minSwipeDistance) onPrev();
  };

  // Memoizar valores calculados para evitar re-renders desnecessários
  const currentPhoto = useMemo(
    () => photos[activeIndex],
    [photos, activeIndex]
  );

  const isFavorited = useMemo(
    () => favorites.includes(String(currentPhoto?.id)),
    [favorites, currentPhoto?.id]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onNext, onPrev]);

  // 🎯 GESTÃO DA URL COM FALLBACK usando hook centralizado
  // Usa constantes específicas para VIEW (visualização), não download
  // VIEW_MOBILE: 720px (~500-700KB) - Suficiente para telas mobile Retina
  // VIEW_DESKTOP: 1080px (~800KB-1.2MB) - Suficiente para visualização Full HD
  // DOWNLOAD usa 2560px quando necessário
  const photoId = currentPhoto?.id;
  const imageWidth = isMobile ? RESOLUTIONS.VIEW_MOBILE : RESOLUTIONS.VIEW_DESKTOP;
  const [realResolution, setRealResolution] = useState<{w: number, h: number} | null>(null);
  // Hook deve ser chamado sempre, mesmo se photoId não existir
  const {
    imgSrc,
    isLoading: isImageLoading,
    handleError,
    handleLoad,
    usingProxy,
  } = useGoogleDriveImage({
    photoId: String(photoId || ''),
    width: imageWidth,
    priority: true,
    fallbackToProxy: true,
  });

  // 🎯 DETECTAR TAMANHO DA IMAGEM (sempre visível)
  useEffect(() => {
    let cancelled = false;

    const getImageSize = async () => {
      // Precisamos da imagem carregada primeiro
      if (!imgSrc || isImageLoading) {
        if (!cancelled) setImageSize(null);
        return;
      }

      try {
        const response = await fetch(imgSrc, { method: 'HEAD' });
        const size = response.headers.get('content-length');

        if (cancelled) return;

        if (size) {
          const sizeInBytes = parseInt(size, 10);
          const sizeInKB = sizeInBytes / 1024;
          
          if (sizeInKB > 1024) {
            if (!cancelled) setImageSize(`${(sizeInKB / 1024).toFixed(2)} MB`);
          } else {
            if (!cancelled) setImageSize(`${sizeInKB.toFixed(0)} KB`);
          }
        } else {
          // Fallback caso o Google mascare o content-length
          if (!cancelled) setImageSize("Otimizada");
        }
      } catch {
        if (!cancelled) setImageSize(null);
      }
    };

    const img = new Image();
img.onload = () => {
  if (cancelled) return;
  
  // 🎯 Captura a resolução real que o Google entregou
  setRealResolution({
    w: img.naturalWidth,
    h: img.naturalHeight
  });
};
img.src = imgSrc;
    // Aguarda um pouco para garantir que a imagem está pronta
    const timeoutId = setTimeout(() => {
      getImageSize();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [imgSrc, isImageLoading]);

  // 🎯 LÓGICA DE PRELOAD (Próxima + Anterior) - usa mesmas resoluções VIEW
  useEffect(() => {
    const imageWidth = isMobile ? RESOLUTIONS.VIEW_MOBILE : RESOLUTIONS.VIEW_DESKTOP;

    // Preload próxima foto
    if (activeIndex + 1 < photos.length) {
      const nextId = photos[activeIndex + 1].id;
      const nextImg = new Image();
      nextImg.src = getDirectGoogleUrl(nextId, imageWidth);
    }

    // Preload foto anterior
    if (activeIndex > 0) {
      const prevId = photos[activeIndex - 1].id;
      const prevImg = new Image();
      prevImg.src = getDirectGoogleUrl(prevId, imageWidth);
    }
  }, [activeIndex, photos, isMobile]);

  useEffect(() => {
    // Em mobile, sempre mostrar interface (já é o estado inicial)
    if (typeof window === 'undefined' || window.innerWidth < 768) {
      return;
    }

    let timer: NodeJS.Timeout;
    const handleActivity = () => {
      setShowInterface(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowInterface(false), 3000);
    };
    
    window.addEventListener('mousemove', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      clearTimeout(timer);
    };
  }, []);

  // Memoizar classe de visibilidade da interface
  const interfaceVisibilityClass = useMemo(
    () =>
      'transition-all duration-700 ' +
      (showInterface
        ? 'opacity-100 translate-y-0 visible'
        : 'md:opacity-0 md:-translate-y-4 md:pointer-events-none md:invisible'),
    [showInterface]
  );

  if (!currentPhoto) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col md:block overflow-y-auto md:overflow-hidden select-none"
      onTouchStart={isSingleView ? undefined : onTouchStart}
      onTouchMove={isSingleView ? undefined : onTouchMove}
      onTouchEnd={isSingleView ? undefined : onTouchEnd}
    >
      {/* 🎯 NAVEGAÇÃO DESKTOP: Exclusiva para MD+ e sincronizada com interface */}
      {!isSingleView && (
        <div
          className={`transition-all duration-700 ${
            showInterface ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Botão Anterior */}
          <button
            onClick={onPrev}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-[250] 
               w-16 md:w-32 h-32 md:h-64 flex items-center justify-center 
               text-white/20 hover:text-[#F3E5AB] transition-all group"
          >
            <ChevronLeft
              className="w-10 h-10 md:w-16 md:h-16 shrink-0 transition-transform group-hover:scale-110"
              strokeWidth={1}
            />
          </button>

          {/* Botão Próximo */}
          <button
            onClick={onNext}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[250] 
               w-16 md:w-32 h-32 md:h-64 flex items-center justify-center 
               text-white/20 hover:text-[#F3E5AB] transition-all group"
          >
            <ChevronRight
              className="w-10 h-10 md:w-16 md:h-16 shrink-0 transition-transform group-hover:scale-110"
              strokeWidth={1}
            />
          </button>
        </div>
      )}

      {/* 1. Título: Sempre à esquerda, ocupa a primeira coluna do grid */}
      {/* HEADER & TOOLBAR */}
      <header
        className={`relative md:fixed top-0 left-0 right-0 p-4  z-[300] bg-black md:bg-transparent ${interfaceVisibilityClass}`}
      >
        {/* No Mobile: flex-col (Toolbar abaixo do título). No Desktop: flex-row com itens alinhados ao topo */}
        <div className="relative w-full flex flex-col md:flex-row items-start justify-between gap-4 md:gap-0">
          {/* Título: Largura total no mobile, limitada no desktop */}
          <div className="w-full md:max-w-[30%] min-w-0">
            <GaleriaHeader
              title={galleryTitle}
              location={location}
              data={galeria.date}
              className="line-clamp-2"
            />
          </div>

          {/* Toolbar: 
        Mobile: Continua no fluxo (abaixo), posição fixa.
        Desktop: Sobrepõe à direita, com controle de profundidade (z-index). */}
          <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0 z-[310]">
            <ToolbarGalleryView
            key={currentPhoto.id}
              photoId={currentPhoto.id}
              gallerySlug={galeria.slug}
              galleryTitle={galleryTitle}
              galeria={galeria}
              activeIndex={activeIndex}
              isFavorited={isFavorited}
              onToggleFavorite={() => onToggleFavorite(String(currentPhoto.id))}
              onClose={onClose}
              showClose={!isSingleView}
              closeLabel="Fechar"
            />
          </div>
        </div>
      </header>

      {/* ÁREA DA FOTO */}
      <main className="flex-none md:fixed md:inset-0 md:z-[10] flex flex-col items-center justify-center min-h-[60vh] md:min-h-0 px-4 md:px-0">
        <div className="relative w-full flex flex-col items-center justify-center min-h-[50vh] md:min-h-0">
          {/* Spinner centralizado */}
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-[50] bg-black">
              {/* Mostra SM no mobile e oculta no desktop */}
              <div className="md:hidden">
                <LoadingSpinner size="sm" />
              </div>
              {/* Oculta no mobile e mostra MD no desktop */}
              <div className="hidden md:block">
                <LoadingSpinner size="md" />
              </div>
            </div>
          )}

          {/* 
              A 'key' força o React a tratar como um novo elemento.
              O CSS 'animate-in fade-in zoom-in' do Tailwind cria o efeito suave.
          */}
          <img
            key={`${photoId}-${usingProxy}`}
            src={imgSrc}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-auto max-w-full md:h-screen md:w-auto md:object-contain transition-all duration-700 ease-out
              ${
                isImageLoading
                  ? 'opacity-0 scale-95 blur-md'
                  : 'opacity-100 scale-100 blur-0 animate-in fade-in zoom-in duration-500'
              }`}
            loading="eager"
            decoding="sync"
            alt={`${galleryTitle} - Foto ${activeIndex + 1}`}
          />
        </div>
      </main>

      {/* RODAPÉ */}
      <footer
        className={`relative md:fixed bottom-0 left-0 right-0 w-full p-8  md:pb-10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-6 bg-black md:bg-transparent z-[100] transition-all duration-700 ${showInterface ? 'opacity-100' : 'md:opacity-0 md:translate-y-4'}`}
      >
        {/* 🎯 NAVEGAÇÃO DESKTOP: Exclusiva para MD+ e sincronizada com interface */}
        {!isSingleView && (
  <div className="md:order-1">
    <div 
      className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-3 transition-all"
      title={`Resolução: ${realResolution ? `${realResolution.w}x${realResolution.h}px` : '...'} | Tamanho: ${imageSize || '...'} | Origem: ${usingProxy ? 'Servidor (A)' : 'Google Drive (D)'}`}
    >
      {/* 1. Contador de Fotos */}
      <div className="flex items-center gap-2 shrink-0">
        <ImageIcon size={13} className="text-[#F3E5AB]" />
        <p className="text-white/90 text-[11px] font-medium tracking-tight">
          Foto <span className="text-[#F3E5AB]">{activeIndex + 1}</span> de {totalPhotos}
        </p>
      </div>

      {/* 2. Divisor Minimalista */}
      <div className="h-3 w-[1px] bg-white/20" />

      {/* 3. Bloco de Dados Técnicos (Tudo no mesmo tamanho/fonte) */}
      <div className="flex items-center gap-2.5 cursor-help">
        {/* Tamanho da Foto */}
        <p className="text-[#F3E5AB] text-[11px] font-medium min-w-[6px] text-right">
          {imageSize || "--- KB"}
        </p>

        

        {/* Letra de Origem */}
        <p className={`text-[11px] font-black ${usingProxy ? 'text-blue-400' : 'text-green-500'}`}>
          {usingProxy ? 'A' : 'D'}
        </p>
      </div>
    </div>
  </div>
)}
        <div className="md:order-2 flex justify-center md:justify-end">
          <PhotographerAvatar galeria={galeria} position="bottom-lightbox" />
        </div>
      </footer>
    </div>
  );
}
