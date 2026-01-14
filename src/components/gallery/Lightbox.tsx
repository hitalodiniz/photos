'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageCircle,
  Loader2,
  Heart,
} from 'lucide-react';
import { GalleryHeader, PhotographerAvatar } from '@/components/gallery';
import { getImageUrl, getProxyUrl } from '@/core/utils/url-helper';
import { GALLERY_MESSAGES } from '@/constants/messages';

import type { Galeria } from '@/core/types/galeria';
import LoadingSpinner from '../ui/LoadingSpinner';
import { getCleanSlug, executeShare } from '@/core/utils/share-helper';
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';
import { div } from 'framer-motion/client';

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
}: LightboxProps) {
  const [, setShowHint] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showButtonText, setShowButtonText] = useState(false);
  const [showInterface, setShowInterface] = useState(true);
  //Timer para suavizar a expansão dos botões (Debounce de hover)
  const buttonHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleButtonMouseEnter = () => {
    if (buttonHoverTimeoutRef.current)
      clearTimeout(buttonHoverTimeoutRef.current);
    setShowButtonText(true);
  };

  const handleButtonMouseLeave = () => {
    buttonHoverTimeoutRef.current = setTimeout(() => {
      setShowButtonText(false);
    }, 250); // Delay para não fechar abruptamente
  };

  //Efeito que oculta tudo da tela, exceto a foto, quando não mexe o mouse
  useEffect(() => {
    // Detecta se é mobile (largura menor que 768px)
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setShowInterface(true);
      return;
    }

    let timer: NodeJS.Timeout;
    const handleActivity = () => {
      setShowInterface(true); // Reativa a interface ao mover ou tocar
      clearTimeout(timer);
      timer = setTimeout(() => setShowInterface(false), 2000); // Oculta após 2s
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      clearTimeout(timer);
    };
  }, []);

  const minSwipeDistance = 50;

  // Lógica de Swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) onNext();
    else if (distance < -minSwipeDistance) onPrev();
  };

  // 3. CORREÇÃO DO ERRO: Use activeIndex em vez de index
  const currentPhotoId = photos[activeIndex]?.id;
  const isFavorited = favorites.includes(String(currentPhotoId));
  // Contador de quantos favoritos existem no total nesta galeria
  const totalFavorites = favorites.length;

  // 4. Função para favoritar/desfavoritar
  const toggleFavorite = () => {
    if (!currentPhotoId) return;

    // Verifica se é a PRIMEIRA vez que o usuário interage com favoritos nesta galeria
    //const hasHistory = localStorage.getItem(`fav_${galeria.id}`);

    //if (!hasHistory && !isFavorited) {
    setShowHint(true);
    // O balão some automaticamente após 6 segundos
    setTimeout(() => setShowHint(false), 2000);
    //}

    onToggleFavorite(String(currentPhotoId));
  };

  //Efeito dos botões de ação
  useEffect(() => {
    // Oculta o texto após 5 segundos da primeira abertura
    const timer = setTimeout(() => setShowButtonText(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Proteção de dados
  if (!photos || !photos[activeIndex]) return null;
  const photo = photos[activeIndex];

  // Pre-load e Scroll lock
  useEffect(() => {
    setIsImageLoading(true); // FUNDAMENTAL: Resetar o estado ao mudar a foto
    if (activeIndex + 1 < photos.length) {
      const nextImg = new Image();
      nextImg.src = getImageUrl(photos[activeIndex + 1].id, 'w1600'); // Use a mesma resolução do lightbox
    }
  }, [activeIndex, photos]);

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

  const handleShareWhatsApp = () => {
    const shareUrl = `${window.location.origin}/photo/${photo.id}?s=${getCleanSlug(galeria.slug)}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);

    executeShare({
      title: galleryTitle,
      text: shareText,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[999] bg-black flex flex-col items-center overflow-x-hidden overflow-hidden md:overflow-hidden select-none scrollbar-hide"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* TITULO MOBILE */}

      <div
        className="md:hidden relative top-0 left-0 
        right-0 
          flex flex-col items-center
          p-4 text-white z-[200] w-full gap-4 
          transition-all duration-700 ease-in-out
          pb-0
                  opacity-100 translate-y-0"
      >
        <div className="flex-grow min-w-0 w-full pr-4">
          <GalleryHeader
            title={galleryTitle}
            location={location}
            data={galeria.date}
          />
        </div>
      </div>
      <div
        className="relative md:fixed inset-0 z-[999] flex 
       flex-col bg-black animate-in fade-in duration-300 min-h-full"
      >
        {/* TITULO DESKTOP */}
        <div
          className={`hidden md:block absolute top-0 left-0 right-0 
            flex flex-col md:flex-row items-center
            p-4 md:px-14 md:py-8 text-white z-[200] 
            w-full gap-4 md:gap-6 transition-all duration-700 ease-in-out ${
              showInterface
                ? 'opacity-100 translate-y-0'
                : 'md:opacity-0 md:-translate-y-4 md:pointer-events-none'
            }`}
        >
          <div className="flex-grow min-w-0 w-full md:w-auto pr-4">
            <GalleryHeader
              title={galleryTitle}
              location={location}
              data={galeria.date}
            />
          </div>
        </div>
        {/* Barra de Ferramentas centralizada no mobile e à direita no desktop */}
        <div
          className={`relative md:absolute 
            flex flex-col md:flex-row items-center justify-between 
            p-2 md:px-14 md:py-8 text-white/90 z-[200]  from-black/95 via-black/40 to-transparent w-full gap-4 md:gap-6 transition-all duration-700 ease-in-out ${showInterface ? 'opacity-100 translate-y-0' : 'md:opacity-0 md:translate-y-4 md:pointer-events-none'}`}
        >
          <div className=" md:w-auto md:ml-auto flex justify-center md:justify-end pointer-events-auto z-[200]">
            <div
              className={`
                flex items-center bg-black/80 backdrop-blur-2xl p-2 px-3 rounded-2xl border border-white/20 shadow-2xl 
                /* MODIFICAÇÃO 2: Transição de container suavizada */
                transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
              `}
              onMouseEnter={handleButtonMouseEnter} // Usando a nova função
              onMouseLeave={handleButtonMouseLeave} // Usando a nova função
              role="toolbar"
            >
              <button
                onClick={handleShareWhatsApp}
                className="flex flex-col md:flex-row items-center gap-1 md:gap-0 transition-all duration-500 group border-r border-white/10 pr-3"
                title="Compartilhar no WhatsApp"
              >
                <div
                  className="flex items-center justify-center 
                w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 
                group-hover:bg-[#25D366] transition-all duration-300 shrink-0"
                >
                  <MessageCircle className="text-white w-[16px] h-[16px] md:w-[20px] md:h-[20px] transition-colors" />
                </div>
                <div
                  className={`flex flex-col items-center md:items-start leading-none transition-all duration-500 overflow-hidden 
                  ${
                    showButtonText
                      ? 'opacity-100 max-h-[40px] md:max-w-[100px] mt-1 md:mt-0 md:ml-2'
                      : 'opacity-0 max-h-0 md:max-w-0 mt-0 md:ml-0'
                  }`}
                >
                  <span className="text-[9px] md:text-[11px] font-semibold uppercase tracking-widest italic text-white whitespace-nowrap">
                    WhatsApp
                  </span>
                  <span className="text-[8px] md:text-[11px] opacity-60 font-semibold text-white/70 whitespace-nowrap">
                    Compartilhar
                  </span>
                </div>
              </button>

              <div
                className="relative flex items-center border-r border-white/10 ml-2"
                key={`fav-container-${currentPhotoId}`}
              >
                <button
                  onClick={toggleFavorite}
                  className="flex flex-col md:flex-row items-center gap-1 md:gap-0 transition-all duration-500 group border-r border-white/10 pr-3"
                  title="Favoritar foto"
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full transition-all duration-300 shrink-0 ${
                      isFavorited
                        ? 'bg-[#E67E70] shadow-lg'
                        : 'bg-white/5 group-hover:bg-[#E67E70]'
                    }`}
                  >
                    <Heart
                      fill={isFavorited ? 'white' : 'none'}
                      className={`w-[16px] h-[16px] md:w-[20px] md:h-[20px] transition-all duration-300 ${
                        isFavorited
                          ? 'text-white animate-pulse' // O animate-pulse agora será resetado pela key
                          : 'text-white'
                      }`}
                    />
                  </div>
                  <div
                    className={`flex flex-col items-center md:items-start leading-none transition-all duration-500 overflow-hidden 
                    ${
                      showButtonText
                        ? 'opacity-100 max-h-[40px] md:max-w-[100px] mt-1 md:mt-0 md:ml-2'
                        : 'opacity-0 max-h-0 md:max-w-0 mt-0 md:ml-0'
                    }`}
                  >
                    <span className="text-[9px] md:text-[11px] font-semibold uppercase tracking-widest italic text-white whitespace-nowrap">
                      Favoritar
                    </span>
                    <span className="text-[8px] md:text-[11px] opacity-60 font-semibold text-white/70 whitespace-nowrap">
                      {totalFavorites > 0 ? `(${totalFavorites})` : 'Foto'}
                    </span>
                  </div>
                </button>
              </div>
              <div className="relative flex items-center border-r border-white/10 ml-2">
                <button
                  onClick={() =>
                    handleDownloadPhoto(
                      galeria,
                      photos[activeIndex].id,
                      activeIndex,
                    )
                  }
                  className="flex flex-col md:flex-row items-center gap-1 md:gap-0 transition-all duration-500 group border-r border-white/10 pr-3"
                  title="Download em alta resolução"
                >
                  <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 group-hover:bg-white transition-all duration-300 shrink-0">
                    {isDownloading ? (
                      <Loader2 className="animate-spin text-[#E67E70] w-[16px] h-[16px] md:w-[20px] md:h-[20px]" />
                    ) : (
                      <Download className="text-white group-hover:text-black transition-colors w-[16px] h-[16px] md:w-[20px] md:h-[20px]" />
                    )}
                  </div>
                  <div
                    className={`flex flex-col items-center md:items-start leading-none transition-all duration-500 overflow-hidden 
                    ${
                      showButtonText
                        ? 'opacity-100 max-h-[40px] md:max-w-[100px] mt-1 md:mt-0 md:ml-2'
                        : 'opacity-0 max-h-0 md:max-w-0 mt-0 md:ml-0'
                    }`}
                  >
                    <span className="text-[9px] md:text-[11px] font-semibold uppercase tracking-widest italic text-white whitespace-nowrap">
                      Download
                    </span>
                    <span className="text-[8px] md:text-[11px] opacity-60 font-semibold text-white/70 whitespace-nowrap">
                      Alta Resolução
                    </span>
                  </div>
                </button>
              </div>
              <div className="relative flex items-center  border-white/10 ml-2">
                {/* BOTÃO FECHAR - Adicionado e.preventDefault e cursor reforçado */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  className="flex flex-col md:flex-row items-center gap-1 md:gap-0 transition-all duration-500 group  border-white/10 "
                >
                  <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/5 hover:bg-red-500/20 transition-colors shrink-0">
                    <X className="text-white hover:text-red-400  w-[16px] h-[16px] md:w-[20px] md:h-[20px]" />
                  </div>
                  <div
                    className={`flex flex-col items-center md:items-start leading-none transition-all duration-500 overflow-hidden 
                          ${
                            showButtonText
                              ? 'opacity-100 max-h-[40px] md:max-w-[100px] mt-1 md:mt-0 md:ml-2'
                              : 'opacity-0 max-h-0 md:max-w-0 mt-0 md:ml-0'
                          }`}
                  >
                    <span className="text-[9px] md:text-[11px] font-semibold uppercase tracking-widest italic text-white whitespace-nowrap">
                      Fechar
                    </span>
                    <span className="text-[8px] md:text-[11px] opacity-60 font-semibold text-white/70 whitespace-nowrap">
                      Acessar galeria
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA CENTRAL - Foto Ocupando Máximo de Espaço com Efeito de Brilho */}
        <div className="flex-1 relative w-full flex flex-col items-center justify-center px-2 md:px-0 py-2 md:py-0">
          {/* 1. SETA ESQUERDA - Área de clique centralizada verticalmente */}
          <button
            onClick={onPrev}
            className={`
                absolute left-0 top-1/2 -translate-y-1/2 z-[80] 
                h-fit py-10 px-2 md:px-4 
                text-white/20 hover:text-champagne-light
                transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${
                  showInterface
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-4 pointer-events-none'
                }
              `}
          >
            <ChevronLeft
              className="w-10 h-10 md:w-16 md:h-16"
              strokeWidth={1}
            />
          </button>

          <div className="flex flex-col items-center justify-center w-full h-full max-h-screen">
            <div className="relative flex flex-col items-center">
              {/* SPINNER CENTRALIZADO */}
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-[50] bg-black/10 backdrop-blur-[2px]">
                  <LoadingSpinner size="md" />
                </div>
              )}

              <img
                key={photos[activeIndex].id}
                // Aumentado para w1600 para nitidez no Lightbox
                src={getProxyUrl(photos[activeIndex].id, '1600')}
                onLoad={() => setIsImageLoading(false)}
                // Removido o 'first-letter:' e corrigido a lógica de transição
                className={`max-w-full max-h-[75vh] md:max-h-screen object-contain transition-all duration-1000 ease-out shadow-[0_0_80px_rgba(0,0,0,0.9)] ${
                  isImageLoading
                    ? 'opacity-0 scale-95 blur-sm'
                    : 'opacity-100 scale-100 blur-0 brightness-110'
                }`}
                alt="Visualização da foto"
              />
            </div>
          </div>
          {/* 2. SETA DIREITA - Libera o topo para o botão X */}
          <button
            onClick={onNext}
            className={`
                absolute right-0 top-1/2 -translate-y-1/2 z-[80] 
                h-fit py-10 px-2 md:px-6 
                text-white/20 hover:text-champagne-light
                transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${
                  showInterface
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-4 pointer-events-none'
                }
              `}
          >
            <ChevronRight
              className="w-10 h-10 md:w-16 md:h-16"
              strokeWidth={1}
            />
          </button>
        </div>

        {/* RODAPÉ UNIFICADO - Contador Inteligente e Avatar */}
        <div
          className={`relative w-full flex flex-col items-center justify-center gap-2 pb-6 md:pb-0 md:pt-0 transition-all duration-700 ease-in-out ${showInterface ? 'opacity-100 translate-y-0' : 'md:opacity-0 md:translate-y-4 md:pointer-events-none'}`}
        >
          <div className="z-[90] pointer-events-none md:absolute md:left-14 md:bottom-10">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 px-6 rounded-full border border-white/10 shadow-lg">
              <p className="text-white/80 text-sm md:text-lg italic font-serif text-center md:text-left">
                Foto{' '}
                <span className="text-[#F3E5AB] font-semibold">
                  {activeIndex + 1}
                </span>{' '}
                de {totalPhotos}
              </p>
            </div>
          </div>

          <div className="z-[100] w-full flex justify-center">
            <PhotographerAvatar galeria={galeria} position="bottom-lightbox" />
          </div>
        </div>
      </div>
    </div>
  );
}
