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

  const limitedPhotos = displayedPhotos.slice(0, displayLimit);

  const handleShareWhatsAppGrid = (photoId: string) => {
    const shareUrl = `${window.location.origin}/photo/${photoId}?s=${getCleanSlug(galeria.slug)}`;
    const shareText = GALLERY_MESSAGES.PHOTO_SHARE(galleryTitle, shareUrl);
    executeShare({ title: galleryTitle, text: shareText });
  };

  return (
    <div className="w-full h-auto">
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
        <div className="max-w-[1600px] mx-auto px-4 pt-2 pb-2">
          <Gallery withCaption>
            <div
              key={showOnlyFavorites ? 'favorites-grid' : 'full-grid'}
              className={`w-full transition-all duration-700 ${
                showOnlyFavorites
                  ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'
                  : 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 grid-flow-row-dense'
              }`}
            >
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
                        className={`relative group shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl overflow-hidden bg-slate-100 ${
                          showOnlyFavorites
                            ? 'aspect-square'
                            : photo.height > photo.width
                              ? 'md:row-span-2' // Fotos verticais ocupam 2 "espaços" para manter o Masonry
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

                        {/* Botões de Ação */}
                        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-30 pointer-events-none">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavoriteFromGrid(photo.id);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all pointer-events-auto shadow-md ${isSelected ? 'bg-[#E67E70]' : 'bg-black/30 backdrop-blur-md border border-white/20'}`}
                          >
                            <Heart
                              size={18}
                              fill={isSelected ? 'white' : 'none'}
                              className="text-white"
                            />
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleShareWhatsAppGrid(photo.id);
                              }}
                              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto hover:bg-[#25D366]"
                            >
                              <MessageCircle size={18} className="text-white" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPhoto(galeria, photo.id, index);
                              }}
                              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto hover:bg-white group/dl"
                            >
                              <Download
                                size={18}
                                className="text-white group-hover:text-black"
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
            <div className="w-full py-10">
              {!allLoaded && (
                <div className="flex justify-center">
                  <Loader2
                    className="animate-spin text-[#F3E5AB] opacity-50"
                    size={32}
                  />
                </div>
              )}
              <div ref={sentinelRef} className="h-10 w-full" />
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
        className="relative w-full overflow-hidden bg-slate-100/50 flex items-center justify-center"
        style={{
          aspectRatio: showOnlyFavorites ? '1/1' : `${width}/${height}`,
          animation: isAlreadyLoaded ? 'none' : 'fadeInUp 1s ease-out forwards',
        }}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/10 backdrop-blur-[2px]">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {status === 'error' ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 min-h-[200px]">
            <Camera size={24} className="opacity-30" />
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className={`${className} object-cover w-full h-full transition-opacity duration-700 ${
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
