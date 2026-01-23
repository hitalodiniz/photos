'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon, X } from 'lucide-react';
import { GaleriaHeader } from './GaleriaHeader';
import PhotographerAvatar from './PhotographerAvatar';
import { getDirectGoogleUrl, RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import type { Galeria } from '@/core/types/galeria';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ToolbarGalleryView } from './ToolbarGalleryView';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { VerticalThumbnails } from './VerticalThumbnails';
import { ThumbnailStrip } from './ThumbnailStrip';
import { VerticalActionBar } from './VerticalActionBar';

interface Photo {
  id: string | number;
  name?: string;
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
  onNavigateToIndex?: (index: number) => void;
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
  onNavigateToIndex,
  favorites,
  onToggleFavorite,
  isSingleView,
}: LightboxProps) {
  const [showInterface, setShowInterface] = useState(true);
  const [imageSize, setImageSize] = useState<string | null>(null);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideshowProgress, setSlideshowProgress] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(false); // Estado para controlar miniaturas no mobile
  const [hasShownQualityWarning, setHasShownQualityWarning] = useState(false); // 🎯 Controla se o tooltip já foi mostrado
  const [isSystemDark, setIsSystemDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const isMobile = useIsMobile();

  // 🎯 DETECTAR TEMA DO SISTEMA (Para Lightbox adaptar automaticamente)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 🎯 Mostrar tooltip de alta resolução apenas na primeira vez que o lightbox abre
  // Este useEffect foi movido para o ToolbarGalleryView para melhor controle
  // useEffect(() => {
  //   if (!hasShownQualityWarning) {
  //     const timer = setTimeout(() => {
  //       setHasShownQualityWarning(true);
  //     }, 8000); // Marca como mostrado após 8 segundos (tempo de exibição do tooltip)
  //     return () => clearTimeout(timer);
  //   }
  // }, [hasShownQualityWarning]);
  
  // Duração de cada foto no slideshow (em milissegundos) - 5 segundos
  const SLIDESHOW_DURATION = 5000;

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
      if (e.key === 'Escape') {
        onClose();
        setIsSlideshowActive(false);
      }
      if (e.key === 'ArrowRight') {
        onNext();
        setSlideshowProgress(0); // Reset progress ao navegar manualmente
      }
      if (e.key === 'ArrowLeft') {
        onPrev();
        setSlideshowProgress(0); // Reset progress ao navegar manualmente
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onNext, onPrev]);

  // 🎯 SLIDESHOW AUTOMÁTICO
  useEffect(() => {
    if (!isSlideshowActive || isSingleView) {
      setSlideshowProgress(0);
      return;
    }

    // Reset progress quando muda de foto
    setSlideshowProgress(0);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / SLIDESHOW_DURATION) * 100;
      
      if (progress >= 100) {
        // Avança para próxima foto
        if (activeIndex < totalPhotos - 1) {
          onNext();
        } else {
          // Última foto - para o slideshow
          setIsSlideshowActive(false);
          setSlideshowProgress(0);
        }
      } else {
        setSlideshowProgress(progress);
      }
    }, 50); // Atualiza a cada 50ms para animação suave

    return () => clearInterval(interval);
  }, [isSlideshowActive, activeIndex, totalPhotos, onNext, isSingleView]);

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
    imgRef,
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

  // Handler para fechar miniaturas ao clicar fora (mobile) - comportamento Instagram
  const handleClickOutside = (e: any) => {
    if (!isMobile || !showThumbnails) return;
    
    const target = e.target as HTMLElement;
    
    // Não fecha se clicar dentro da barra de miniaturas
    if (target.closest('[data-thumbnail-strip]')) {
      return;
    }
    
    // Fecha se clicar em qualquer lugar fora das miniaturas
    setShowThumbnails(false);
  };

  useEffect(() => {
    if (!isMobile || !showThumbnails) return;

    // Adiciona listener no document para capturar cliques em qualquer lugar
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobile, showThumbnails]);

  if (!currentPhoto) return null;

  return (
    <div className={isSystemDark ? 'dark' : ''} suppressHydrationWarning>
      <div
        className="fixed inset-0 z-[10005] bg-white dark:bg-black flex flex-col md:block overflow-y-auto md:overflow-hidden select-none transition-colors duration-300"
        onTouchStart={isSingleView ? undefined : onTouchStart}
        onTouchMove={isSingleView ? undefined : onTouchMove}
        onTouchEnd={isSingleView ? undefined : onTouchEnd}
        onClick={isMobile ? handleClickOutside : undefined}
      >
      {/* 🎯 MINIATURAS VERTICAIS (Desktop - lado direito) - Por cima dos botões */}
      {!isSingleView && onNavigateToIndex && !isMobile && (
        <VerticalThumbnails
          photos={photos}
          activeIndex={activeIndex}
          onNavigateToIndex={(index) => {
            onNavigateToIndex(index);
            setSlideshowProgress(0);
            if (isSlideshowActive) setIsSlideshowActive(false);
          }}
          isVisible={showInterface}
        />
      )}

      {/* 🎯 BARRA DE AÇÕES VERTICAL (Desktop - lado direito, próxima das miniaturas) */}
      {!isMobile && (
        <div
          className={`transition-all duration-700 ${
            showInterface ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <VerticalActionBar
            photoId={currentPhoto.id}
            photoName={currentPhoto.name} // 🎯 Passando o nome original
            gallerySlug={galeria.slug}
            galleryTitle={galleryTitle}
            galeria={galeria}
            activeIndex={activeIndex}
            isFavorited={isFavorited}
            onToggleFavorite={() => onToggleFavorite(String(currentPhoto.id))}
            isSlideshowActive={isSlideshowActive}
            onToggleSlideshow={() => setIsSlideshowActive(!isSlideshowActive)}
            onClose={onClose}
            showClose={!isSingleView}
            hasShownQualityWarning={hasShownQualityWarning}
            onQualityWarningShown={() => setHasShownQualityWarning(true)}
          />
        </div>
      )}

      {/* 🎯 MINIATURAS HORIZONTAIS (Mobile - parte inferior) */}
      {!isSingleView && onNavigateToIndex && isMobile && (
        <ThumbnailStrip
          photos={photos}
          activeIndex={activeIndex}
          onNavigateToIndex={(index) => {
            onNavigateToIndex(index);
            setSlideshowProgress(0);
            if (isSlideshowActive) setIsSlideshowActive(false);
            // Não fecha as miniaturas ao selecionar - comportamento Instagram
            // As miniaturas só fecham ao clicar fora da barra
          }}
          isVisible={showThumbnails}
        />
      )}

      {/* 🎯 NAVEGAÇÃO DESKTOP: Exclusiva para MD+ e sincronizada com interface */}
      {!isSingleView && (
        <div
          className={`transition-all duration-700 ${
            showInterface ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Botão Anterior */}
          <button
            onClick={() => {
              onPrev();
              setSlideshowProgress(0);
              if (isSlideshowActive) setIsSlideshowActive(false);
            }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-[190] 
               w-16 md:w-32 h-32 md:h-64 flex items-center justify-center 
               text-black/20 dark:text-white/20 hover:text-petroleum hover:dark:text-gold transition-all group"
          >
            <ChevronLeft
              className="w-10 h-10 md:w-16 md:h-16 shrink-0 transition-transform group-hover:scale-110"
              strokeWidth={1}
            />
          </button>

          {/* Botão Próximo - Mais à esquerda, fora da barra de ações */}
          <button
            onClick={() => {
              onNext();
              setSlideshowProgress(0);
              if (isSlideshowActive) setIsSlideshowActive(false);
            }}
            className="fixed top-1/2 -translate-y-1/2 z-[190] 
               w-16 md:w-32 h-32 md:h-64 flex items-center justify-center 
               dark:text-white/20 hover:text-petroleum hover:dark:text-gold transition-all group"
            style={{ right: onNavigateToIndex && !isMobile ? '160px' : '0' }} // Mais à esquerda, fora da barra (112px barra + 48px espaço)
          >
            <ChevronRight
              className="w-10 h-10 md:w-16 md:h-16 shrink-0 transition-transform group-hover:scale-110"
              strokeWidth={1}
            />
          </button>
        </div>
      )}

      {/* 🎯 BARRA DE PROGRESSO SLIDESHOW (Estilo Instagram Stories) */}
      {isSlideshowActive && !isSingleView && (
        <div className="fixed top-0 left-0 right-0 z-[500] px-2 pt-2 pb-1 bg-gradient-to-b from-white/60 dark:from-black/60 to-transparent">
          <div className="flex gap-1">
            {Array.from({ length: totalPhotos }).map((_, index) => (
              <div
                key={index}
                className="flex-1 h-0.5 bg-slate-300 dark:bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-slate-700 dark:bg-white transition-all ease-linear"
                  style={{
                    width:
                      index < activeIndex
                        ? '100%'
                        : index === activeIndex
                        ? `${slideshowProgress}%`
                        : '0%',
                    transitionDuration: index === activeIndex ? '50ms' : '300ms',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. Título: Sempre à esquerda, ocupa a primeira coluna do grid */}
      {/* HEADER & TOOLBAR */}
      <header
        className={`relative md:fixed top-0 left-0 right-0 p-4 z-[300] bg-white dark:bg-black md:bg-transparent dark:md:bg-transparent ${interfaceVisibilityClass} ${isSlideshowActive && !isSingleView ? 'pt-6 md:pt-4' : ''} transition-colors duration-300`}
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

          {/* Toolbar Desktop: Apenas botão Fechar */}
          {onClose && (
            <div className="hidden md:flex w-auto justify-end shrink-0 z-[310]">
              <button
                onClick={onClose}                  className="w-12 h-12 bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center transition-all text-black dark:text-white hover:bg-gold/10 hover:text-gold group relative rounded-luxury"
                aria-label="Fechar galeria"
              >
                <X size={20} className="group-hover:scale-110" strokeWidth={2} />
                {/* Tooltip - Abaixo do botão */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  <div className="bg-gold text-black text-editorial-label px-2 py-1 rounded shadow-xl">
                    Fechar
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-b-gold" />
                </div>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ÁREA DA FOTO */}
      <main 
        className={`flex-none md:fixed md:inset-0 md:z-[10] flex flex-col items-center justify-center px-4 md:px-0 ${isMobile ? 'min-h-[calc(100vh-140px)] pb-20' : 'min-h-[60vh] md:min-h-0'} ${onNavigateToIndex !== undefined && !isMobile && !isSingleView ? 'pr-24' : ''}`}
        onClick={(e) => e.stopPropagation()} // Previne que cliques na foto fechem o lightbox
      >
        {/* Container que ocupa toda altura disponível no desktop (estilo Instagram - máximo espaço) */}
        <div className={`relative w-full h-full flex items-center justify-center ${isMobile ? 'min-h-[50vh]' : 'h-screen md:h-screen'}`}>
          {/* Spinner centralizado */}
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-[50] bg-white dark:bg-black transition-colors duration-300">
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
              🎯 ESTRATÉGIA FACEBOOK/INSTAGRAM:
              - Fotos verticais: ocupam altura total (max-h-full), largura automática
              - Fotos horizontais: ocupam largura total (max-w-full), altura automática
              - object-contain mantém proporção sem distorção
              - Centralizado com flex
          */}
          <img
            key={`${photoId}-${usingProxy}`}
            ref={imgRef}
            src={imgSrc}
            onLoad={handleLoad}
            onError={handleError}
            className={`transition-all duration-700 ease-out
              ${isMobile 
                ? 'w-full h-full object-contain' 
                : 'w-full h-full object-contain'
              }
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

      {/* 🎯 BARRA DE BOTÕES MOBILE - Fixa na parte inferior (similar à imagem) */}
      {isMobile && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[400] bg-white dark:bg-black border-t border-black/10 dark:border-white/10 transition-colors duration-300"
          style={{ 
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            overflow: 'visible', // Permite que tooltips apareçam acima
          }}
        >
          <div className="flex items-center justify-around px-2 py-3" style={{ overflow: 'visible' }}>
            <ToolbarGalleryView
              photoId={currentPhoto.id}
              photoName={currentPhoto.name} // 🎯 Passando o nome original
              gallerySlug={galeria.slug}
              galleryTitle={galleryTitle}
              galeria={galeria}
              activeIndex={activeIndex}
              isFavorited={isFavorited}
              onToggleFavorite={() => onToggleFavorite(String(currentPhoto.id))}
              onClose={onClose}
              showClose={true}
              isSingleView={isSingleView}
              closeLabel="Fechar"
              isMobile={true}
              isSlideshowActive={isSlideshowActive}
              onToggleSlideshow={() => setIsSlideshowActive(!isSlideshowActive)}
              showThumbnails={showThumbnails}
              onToggleThumbnails={onNavigateToIndex ? () => setShowThumbnails(!showThumbnails) : undefined}
              hasShownQualityWarning={hasShownQualityWarning}
              onQualityWarningShown={() => {
                // console.log('[Lightbox] 📢 onQualityWarningShown chamado, setando hasShownQualityWarning=true');
                setHasShownQualityWarning(true);
              }}
            />
          </div>
        </div>
      )}

      {/* 🎯 CONTADOR DE FOTOS - Sempre visível (não oculta com a interface) */}
      {!isSingleView && (
        <div className="hidden md:flex fixed bottom-0 right-0 z-[500] p-4">
          <div className="order-2 flex justify-end">
            <div 
              className="bg-slate-950/90 border border-white/10 text-white backdrop-blur-md px-3 py-1.5 rounded-luxury shadow-2xl flex items-center gap-3 transition-all"
              title={`Resolução: ${realResolution ? `${realResolution.w}x${realResolution.h}px` : '...'} | Tamanho: ${imageSize || '...'} | Origem: ${usingProxy ? 'Servidor (A)' : 'Google Drive (D)'}`}
            >
              {/* Ícone que muda de cor conforme o tema */}
              <ImageIcon size={13} className="text-gold transition-colors duration-300" />
              
              <p className="text-[11px] font-semibold tracking-luxury text-white/90">
                FOTO <span className="text-gold italic">{activeIndex + 1}</span> DE {totalPhotos}
              </p>

              {/* Divisor que adapta a opacidade */}
              <div className="h-3 w-[1px] bg-white/10" />

              {/* Dados Técnicos */}
              <div className="flex items-center gap-2.5">
                <p className="text-gold text-[11px] font-semibold tracking-luxury italic">
                  {imageSize || "--- KB"}
                </p>
                {/* Indicador de origem */}
                <span className="text-[10px] font-semibold text-white/20">
                  {usingProxy ? 'A' : 'D'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RODAPÉ - Desktop apenas (avatar) */}
      {!isSingleView && (
        <footer
          className={`hidden md:flex fixed bottom-0 left-0 w-full flex-row items-center justify-between gap-6 bg-transparent z-[250] transition-all duration-700 ${showInterface ? 'opacity-100' : 'opacity-0 translate-y-4'}`}
          style={{ 
            paddingBottom: '1rem', 
            paddingRight: '1rem', // Mesma margem da toolbar (p-4 do header = 1rem)
            paddingLeft: '1rem', // Mesma margem do título (p-4 do header = 1rem)
            right: 0,
          }}
        >
          {/* 🎯 NAVEGAÇÃO DESKTOP: Exclusiva para MD+ e sincronizada com interface */}
          {!isSingleView && (
            <div className="order-1 flex items-center">
              <PhotographerAvatar galeria={galeria} position="bottom-lightbox" />
            </div>
          )}
        </footer>
      )}
    </div>
  </div>
  );
}
