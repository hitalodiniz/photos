'use client';
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryHeader, PhotographerAvatar } from '@/components/gallery';
import { getProxyUrl } from '@/core/utils/url-helper';
import type { Galeria } from '@/core/types/galeria';
import LoadingSpinner from '../ui/LoadingSpinner';
import { ToolbarGalleryView } from './ToolbarGalleryView';

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
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [showInterface, setShowInterface] = useState(true);

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

  const currentPhoto = photos[activeIndex];
  const isFavorited = favorites.includes(String(currentPhoto?.id));

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

  // Dentro do Lightbox.tsx

  useEffect(() => {
    setIsImageLoading(true);

    // 🎯 CORREÇÃO: Se for visão única, garantimos que o navegador priorize o carregamento
    if (isSingleView) {
      const img = new Image();
      img.src = getProxyUrl(photos[activeIndex].id, '0');
      img.onload = () => setIsImageLoading(false);
    }

    if (activeIndex + 1 < photos.length) {
      const nextImg = new Image();
      nextImg.src = getProxyUrl(photos[activeIndex + 1].id, '1600');
    }
  }, [activeIndex, photos, isSingleView]); // Adicione isSingleView aqui

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) {
      setShowInterface(true);
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

  if (!currentPhoto) return null;

  const interfaceVisibilityClass =
    'transition-all duration-700 ' +
    (showInterface
      ? 'opacity-100 translate-y-0 visible'
      : 'md:opacity-0 md:-translate-y-4 md:pointer-events-none md:invisible');

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

      {/* HEADER & TOOLBAR */}
      <header
        className={`relative md:absolute top-0 left-0 right-0 flex flex-col md:flex-row items-center justify-between p-4 md:px-14 md:py-8 bg-black md:bg-transparent z-[300] shrink-0 ${interfaceVisibilityClass}`}
      >
        <div className="w-full md:w-auto px-2">
          <GalleryHeader
            title={galleryTitle}
            location={location}
            data={galeria.date}
          />
        </div>
        <div className="flex justify-center md:justify-end mt-4 md:mt-0">
          <ToolbarGalleryView
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
              A 'key' forçar o React a tratar como um novo elemento.
              O CSS 'animate-in fade-in zoom-in' do Tailwind cria o efeito suave.
          */}
          <img
            key={currentPhoto.id}
            src={getProxyUrl(currentPhoto.id, '1600')}
            onLoad={() => setIsImageLoading(false)}
            className={`w-full h-auto max-w-full md:h-screen md:w-auto md:object-contain transition-all duration-700 ease-out
              ${
                isImageLoading
                  ? 'opacity-0 scale-95 blur-md'
                  : 'opacity-100 scale-100 blur-0 animate-in fade-in zoom-in duration-500'
              }`}
            loading="eager"
            decoding="sync"
            alt="Visualização"
          />
        </div>
      </main>

      {/* RODAPÉ */}
      <footer
        className={`relative md:fixed bottom-0 left-0 right-0 w-full p-8 md:px-14 md:pb-10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-6 bg-black md:bg-transparent z-[100] transition-all duration-700 ${showInterface ? 'opacity-100' : 'md:opacity-0 md:translate-y-4'}`}
      >
        {/* 🎯 NAVEGAÇÃO DESKTOP: Exclusiva para MD+ e sincronizada com interface */}
        {!isSingleView && (
          <div className="md:order-1">
            <div className="bg-black/40 backdrop-blur-md p-2.5 px-8 rounded-full border border-white/10 shadow-lg">
              <p className="text-white/80 text-[11px] md:text-[12px] font-semibold ">
                Foto{' '}
                <span className="text-[#F3E5AB] font-semibold">
                  {activeIndex + 1}
                </span>{' '}
                de {totalPhotos}
              </p>
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
