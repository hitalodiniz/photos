'use client';
import React, { memo, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Download, Heart, Loader2, MessageCircle } from 'lucide-react';
import 'photoswipe/dist/photoswipe.css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { Galeria } from '@/core/types/galeria';
import { getProxyUrl } from '@/core/utils/url-helper';
import { handleDownloadPhoto } from '@/core/utils/foto-helpers';
import { GALLERY_MESSAGES } from '@/constants/messages';
import { getCleanSlug, executeShare } from '@/core/utils/share-helper';
import LoadingSpinner from '../ui/LoadingSpinner';

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
  columns: { mobile: number; tablet: number; desktop: number };
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
  columns,
}: MasonryGridProps) => {
  const CARDS_PER_PAGE = 50;
  const [displayLimit, setDisplayLimit] = useState(CARDS_PER_PAGE);
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
          setDisplayLimit((prev) =>
            Math.min(prev + CARDS_PER_PAGE, displayedPhotos.length),
          );
        }
      },
      { rootMargin: '0px 0px 400px 0px', threshold: 0.01 },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [displayLimit, displayedPhotos.length, showOnlyFavorites]);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const limitedPhotos = showOnlyFavorites
    ? displayedPhotos
    : displayedPhotos.slice(0, displayLimit);

  const handleShareWhatsAppGrid = (photoId: string) => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(galeria.slug)}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);
    executeShare({ title: galleryTitle, text: shareText });
  };

  const currentCols = isMobile ? columns.mobile : columns.desktop;
  const btnScale = isMobile
    ? currentCols === 2
      ? 0.8
      : 1
    : currentCols <= 4
      ? 1
      : Math.max(0.6, 1 - (currentCols - 4) * 0.1);
  const iconSize = Math.round(18 * btnScale);

  return (
    <div className="w-full h-auto">
      {showOnlyFavorites && displayedPhotos.length === 0 ? (
        <div className="text-center py-10  md:py-20 px-4 animate-in fade-in duration-700">
          <Heart size={48} className="text-champagne-dark mb-2 mx-auto" />
          <p className="italic text-[14px] md:text-[18px] text-white mb-8">
            Nenhuma foto favorita selecionada
          </p>
          <button
            onClick={() => setShowOnlyFavorites(false)}
            className="mx-auto px-4 py-2 rounded-[0.5rem] bg-champagne-dark text-slate-900 uppercase text-[11px] md:text-[12px] font-semibold"
          >
            Exibir todas as fotos
          </button>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-2 pt-2 pb-2">
          <Gallery withCaption>
            <div
              key={showOnlyFavorites ? 'favorites-grid' : 'full-grid'}
              //Gap aqui ajusta o espaçamento entre fotos
              className="w-full transition-all duration-700 grid gap-1.5 grid-flow-row-dense"
              style={{
                gridTemplateColumns: `repeat(${columns.mobile}, minmax(0, 1fr))`,
              }}
            >
              <style jsx>{`
                @media (min-width: 768px) {
                  div {
                    grid-template-columns: repeat(
                      ${Math.min(5, columns.tablet)},
                      minmax(0, 1fr)
                    ) !important;
                  }
                }
                @media (min-width: 1280px) {
                  div {
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
                        id={`photo-${index}`}
                        className={`relative group shadow-sm hover:shadow-xl transition-all duration-500 rounded-[0.5rem] overflow-hidden border border-black/5 ring-1 ring-white/10 ${showOnlyFavorites ? 'aspect-square bg-slate-100' : photo.height > photo.width ? 'md:row-span-2' : 'row-span-1'}`}
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
                            alt=""
                            width={photo.width}
                            height={photo.height}
                            priority={index < 4}
                            showOnlyFavorites={showOnlyFavorites}
                            className="relative z-10"
                          />
                        </a>

                        <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-start z-30 pointer-events-none">
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
                            className={`rounded-full flex items-center justify-center transition-all pointer-events-auto shadow-md ${isSelected ? 'bg-[#E67E70]' : 'bg-black/30 backdrop-blur-md border border-white/10'}`}
                          >
                            <Heart
                              size={
                                isMobile && currentCols === 2 ? 14 : iconSize
                              }
                              fill={isSelected ? 'white' : 'none'}
                              className="text-white"
                            />
                          </button>
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
                <div className="flex justify-center py-10">
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
          aspectRatio: showOnlyFavorites ? '1/1' : `${width}/${height}`,
        }}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/5 backdrop-blur-[2px]">
            <LoadingSpinner size="xs" />
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className={`${className} object-cover w-full h-full scale-[1.01] block transition-opacity duration-700 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          unoptimized
        />
      </div>
    );
  },
);

SafeImage.displayName = 'SafeImage';
export default MasonryGrid;
