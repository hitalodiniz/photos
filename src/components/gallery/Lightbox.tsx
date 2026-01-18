'use client';
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { GaleriaHeader, PhotographerAvatar } from '@/components/gallery';
import { getHighResImageUrl, getProxyUrl } from '@/core/utils/url-helper';
import type { Galeria } from '@/core/types/galeria';
import LoadingSpinner from '../ui/LoadingSpinner';
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
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [showInterface, setShowInterface] = useState(true);
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

    // Define o tamanho e qualidade baseado no hook
    const currentImageUrl = isMobile
      ? getProxyUrl(photos[activeIndex].id, '1280') // Mobile: Leve e nítido
      : getProxyUrl(photos[activeIndex].id, '2560'); // Desktop: Qualidade Ultra (2K) para o fotógrafo
    //const currentImageUrl = getHighResImageUrl(photos[activeIndex].id);

    if (isSingleView) {
      const img = new Image();
      img.src = currentImageUrl;
      img.onload = () => setIsImageLoading(false);
    }

    // 🎯 REVISÃO DO PRELOAD (Próxima Foto):
    // Solicitamos a mesma resolução (1920px) para que quando o usuário
    // clicar em "Próximo", a imagem já esteja no cache do navegador.
    if (activeIndex + 1 < photos.length) {
      const nextImg = new Image();
      nextImg.src = getHighResImageUrl(photos[activeIndex + 1].id);
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
              A 'key' forçar o React a tratar como um novo elemento.
              O CSS 'animate-in fade-in zoom-in' do Tailwind cria o efeito suave.
          */}
          <img
            key={currentPhoto.id}
            src={getHighResImageUrl(currentPhoto.id)}
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
        className={`relative md:fixed bottom-0 left-0 right-0 w-full p-8  md:pb-10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-6 bg-black md:bg-transparent z-[100] transition-all duration-700 ${showInterface ? 'opacity-100' : 'md:opacity-0 md:translate-y-4'}`}
      >
        {/* 🎯 NAVEGAÇÃO DESKTOP: Exclusiva para MD+ e sincronizada com interface */}
        {!isSingleView && (
          <div className="md:order-1">
            <div className="bg-black/40 backdrop-blur-md p-2.5 px-8 rounded-full border border-white/10 shadow-lg flex items-center gap-2">
              {/* Ícone agora alinhado à esquerda pelo flexbox */}
              <ImageIcon
                size={14}
                className="text-[#F3E5AB] opacity-90 shrink-0"
              />

              <p className="text-white/80 text-[11px] md:text-[12px] font-medium">
                Foto{' '}
                <span className="text-[#F3E5AB] font-medium">
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
