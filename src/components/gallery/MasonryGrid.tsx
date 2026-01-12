'use client';
import React, { memo, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Download, Heart, Loader2, MessageCircle } from 'lucide-react';
import 'photoswipe/dist/photoswipe.css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { Galeria } from '@/core/types/galeria';
import { getProxyUrl } from '@/core/utils/url-helper';
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { getCleanSlug, executeShare } from '@/core/utils/share-helper';
import LoadingSpinner from '../ui/LoadingSpinner';
import { div } from 'framer-motion/client';

interface Photo {
  id: string;
  url: string;
  width: number;
  height: number;
}

interface MasonryGridProps {
  galleryTitle: string;
  galeria: Galeria;
  displayedPhotos: Photo[];
  favorites: string[];
  toggleFavoriteFromGrid: (id: string) => void;
  setSelectedPhotoIndex: (index: number) => void;
  photos: Photo[];
  showOnlyFavorites: boolean;
  setShowOnlyFavorites: (value: boolean) => void;
}

const MasonryGrid = ({
  galleryTitle,
  galeria,
  displayedPhotos,
  favorites,
  toggleFavoriteFromGrid,
  setSelectedPhotoIndex,
  showOnlyFavorites,
  setShowOnlyFavorites,
}: MasonryGridProps) => {
  const qtdeFotos = 12;
  const [displayLimit, setDisplayLimit] = useState(qtdeFotos);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const allLoaded = showOnlyFavorites || displayLimit >= displayedPhotos.length;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          displayLimit < displayedPhotos.length &&
          !showOnlyFavorites
        ) {
          setTimeout(() => {
            setDisplayLimit((prev) =>
              Math.min(prev + qtdeFotos, displayedPhotos.length),
            );
          }, 100);
        }
      },
      { rootMargin: '0px 0px 1000px 0px', threshold: 0.01 },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [displayLimit, displayedPhotos.length, showOnlyFavorites]);

  // 2. Estado inicial respeitando seus limites
  const [columns, setColumns] = useState({
    mobile: Math.min(2, galeria.columns_mobile || 2),
    tablet: Math.min(5, Math.max(2, galeria.columns_tablet || 3)),
    desktop: Math.min(8, Math.max(3, galeria.columns_desktop || 5)),
  });

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const limitedPhotos = displayedPhotos.slice(0, displayLimit);

  const handleShareWhatsAppGrid = (photoId: string) => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(galeria.slug)}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);
    executeShare({ title: galleryTitle, text: shareText });
  };

  const currentCols = isMobile ? columns.mobile : columns.desktop;

  // No mobile com 2 colunas, reduzimos para 0.85. No desktop segue a lógica de densidade.
  const btnScale = isMobile
    ? currentCols === 2
      ? 0.8
      : 1
    : currentCols <= 4
      ? 1
      : Math.max(0.6, 1 - (currentCols - 4) * 0.1);

  const iconSize = Math.round(18 * btnScale);
  // Padding interno dinâmico para o botão não parecer "vazio"
  const btnPadding = isMobile && currentCols === 2 ? 'p-1' : 'p-2';

  return (
    <div className="w-full h-auto">
      {/* Seletor de Densidade */}
      <div className="flex justify-center items-center gap-3 px-4 overflow-x-auto pb-2 scrollbar-hide">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#D4AF37] font-black self-center mr-1 whitespace-nowrap">
          Colunas
        </span>

        <div className="flex gap-1.5 p-1 bg-black/5 backdrop-blur-sm rounded-xl border border-[#F3E5AB]/30">
          {(isMobile ? [1, 2] : [3, 4, 5, 6, 7, 8]).map((num) => {
            const isActive = isMobile
              ? columns.mobile === num
              : columns.desktop === num;

            return (
              <button
                key={num}
                onClick={() =>
                  setColumns((prev) => ({
                    ...prev,
                    mobile: isMobile ? num : prev.mobile,
                    desktop: !isMobile ? num : prev.desktop,
                    tablet: !isMobile
                      ? Math.min(5, Math.max(2, num - 1))
                      : prev.tablet,
                  }))
                }
                className={`
            w-8 h-8 rounded-lg text-[10px] font-black transition-all duration-500
            flex items-center justify-center
            ${
              isActive
                ? 'bg-[#D4AF37] text-white shadow-[0_4px_12px_rgba(212,175,55,0.4)] scale-105'
                : 'text-slate-500 hover:text-[#D4AF37] hover:bg-white/80'
            }
          `}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>
      {showOnlyFavorites && displayedPhotos.length === 0 ? (
        <div className="text-center py-40 px-4 animate-in fade-in duration-700">
          <Heart size={48} className="text-champagne-dark mb-2 mx-auto" />
          <p className="italic text-lg text-white mb-8">
            Nenhuma foto favorita selecionada
          </p>
          <button
            onClick={() => setShowOnlyFavorites(false)}
            className="mx-auto px-8 py-3 rounded-full bg-champagne-dark text-slate-900 uppercase text-[12px] font-bold"
          >
            Exibir todas as fotos
          </button>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-2 pt-2 pb-2">
          <Gallery withCaption>
            <div
              key={showOnlyFavorites ? 'favorites-grid' : 'full-grid'}
              className="w-full transition-all duration-700 grid gap-4 md:gap-2 grid-flow-row-dense"
              style={{
                // Mobile: Usa o estado (limitado a 2 pelo seletor)
                gridTemplateColumns: `repeat(${columns.mobile}, minmax(0, 1fr))`,
              }}
            >
              {/* Media queries para Tablet e Desktop via Style Tag ou Tailwind Arbitrary Values */}
              <style jsx>{`
                @media (min-width: 768px) {
                  div {
                    /* Tablet: Trava rígida em 5 */
                    grid-template-columns: repeat(
                      ${Math.min(5, columns.tablet)},
                      minmax(0, 1fr)
                    ) !important;
                  }
                }
                @media (min-width: 1280px) {
                  div {
                    /* Desktop: Trava rígida em 8 */
                    grid-template-columns: repeat(
                      ${Math.min(8, columns.desktop)},
                      minmax(0, 1fr)
                    ) !important;
                  }
                }
              `}</style>
              {limitedPhotos.map((photo, index) => {
                const isSelected = favorites.includes(photo.id);
                return (
                  <Item
                    key={photo.id}
                    original={getProxyUrl(photo.id, '1600')}
                    thumbnail={getProxyUrl(photo.id, '600')}
                    width={photo.width}
                    height={photo.height}
                    caption={`${galleryTitle} - Foto ${index + 1}`}
                  >
                    {({ ref }) => (
                      <div
                        className={`relative group shadow-sm hover:shadow-xl transition-all duration-500 rounded-[0.5rem] overflow-hidden break-inside-avoid 
                          border border-black/5 ring-1 ring-white/10
                          ${
                            showOnlyFavorites
                              ? 'aspect-square bg-slate-100'
                              : photo.height > photo.width
                                ? 'md:row-span-2'
                                : 'row-span-1'
                          }`}
                      >
                        <a
                          href="#"
                          ref={ref as any}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedPhotoIndex(index);
                          }}
                          className="block cursor-zoom-in relative w-full h-full"
                        >
                          <SafeImage
                            photoId={photo.id}
                            src={getProxyUrl(photo.id, '400')}
                            alt={`Foto ${index + 1}`}
                            width={photo.width}
                            height={photo.height}
                            priority={index < 4}
                            showOnlyFavorites={showOnlyFavorites}
                            className="relative z-10"
                          />
                        </a>

                        {/* Botões de Ação - Redimensionamento Dinâmico */}
                        <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-start z-30 pointer-events-none">
                          {/* Botão de Favorito */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavoriteFromGrid(photo.id);
                            }}
                            style={{
                              width: `${isMobile && currentCols === 2 ? 32 : 40 * btnScale}px`,
                              height: `${isMobile && currentCols === 2 ? 32 : 40 * btnScale}px`,
                            }}
                            className={`rounded-full flex items-center justify-center transition-all pointer-events-auto shadow-md ${
                              isSelected
                                ? 'bg-[#E67E70]'
                                : 'bg-black/30 backdrop-blur-md border border-white/10'
                            }`}
                          >
                            <Heart
                              size={
                                isMobile && currentCols === 2 ? 14 : iconSize
                              }
                              fill={isSelected ? 'white' : 'none'}
                              className="text-white"
                            />
                          </button>

                          {/* Grupo de Ação (Whats e Download) */}
                          <div className="flex gap-1.5 md:gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleShareWhatsAppGrid(photo.id);
                              }}
                              style={{
                                width: `${isMobile && currentCols === 2 ? 32 : 40 * btnScale}px`,
                                height: `${isMobile && currentCols === 2 ? 32 : 40 * btnScale}px`,
                              }}
                              className="rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto active:bg-[#25D366]"
                            >
                              <MessageCircle
                                size={
                                  isMobile && currentCols === 2 ? 14 : iconSize
                                }
                                className="text-white"
                              />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPhoto(galeria, photo.id, index);
                              }}
                              style={{
                                width: `${isMobile && currentCols === 2 ? 32 : 40 * btnScale}px`,
                                height: `${isMobile && currentCols === 2 ? 32 : 40 * btnScale}px`,
                              }}
                              className="rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto active:bg-white active:text-black"
                            >
                              <Download
                                size={
                                  isMobile && currentCols === 2 ? 14 : iconSize
                                }
                                className="text-white active:text-black"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Item>
                );
              })}
            </div>
          </Gallery>

          {!showOnlyFavorites && (
            <div className="w-full">
              {!allLoaded && (
                <div className="flex justify-center">
                  <Loader2
                    className="animate-spin text-[#F3E5AB] opacity-50"
                    size={32}
                  />
                </div>
              )}
              <div ref={sentinelRef} className="h-2 w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const loadedImagesCache = new Set<string>();

const SafeImage = memo(
  ({
    src,
    alt,
    width,
    height,
    priority,
    className,
    showOnlyFavorites,
    photoId,
  }: any) => {
    const isAlreadyLoaded = loadedImagesCache.has(photoId);
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
      isAlreadyLoaded ? 'loaded' : 'loading',
    );

    const handleLoad = () => {
      loadedImagesCache.add(photoId);
      setStatus('loaded');
    };

    return (
      <div
        className="relative w-full h-full overflow-hidden flex items-center justify-center"
        style={{
          // Garante que o container tenha a proporção calculada
          aspectRatio: showOnlyFavorites ? '1/1' : `${width}/${height}`,
          animation: isAlreadyLoaded ? 'none' : 'fadeInUp 1s ease-out forwards',
        }}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/5 backdrop-blur-[2px]">
            <LoadingSpinner size="xs" />
          </div>
        )}

        {status === 'error' ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 min-h-[200px] bg-slate-100">
            <Camera size={24} className="opacity-30" />
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            // O segredo está aqui:
            // 1. scale-[1.01] dá o "zoom" necessário para cobrir gaps de sub-pixel
            // 2. object-cover garante que a imagem preencha a área sem distorcer
            // 3. min-w-full e min-h-full reforçam o preenchimento absoluto
            className={`${className} object-cover w-full h-full min-w-full min-h-full scale-[1.01] block transition-opacity duration-700 ${
              status === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleLoad}
            onError={() => setStatus('error')}
            unoptimized
          />
        )}
      </div>
    );
  },
);

SafeImage.displayName = 'SafeImage';
export default MasonryGrid;
