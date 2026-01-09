'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Download, Heart, MessageCircle } from 'lucide-react';
import 'photoswipe/dist/photoswipe.css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { Galeria } from '@/core/types/galeria';
import { getHighResImageUrl, getImageUrl } from '@/core/utils/url-helper';
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

const getDownloadFileName = (index: number, galleryTitle: string) => {
  const cleanTitle = galleryTitle.replace(/[^a-zA-Z0-9 ]/g, '');
  const shortTitle = cleanTitle.substring(0, 20).replace(/\s+/g, '-');
  return `foto-${index + 1}-${shortTitle}.jpg`;
};

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
  const [displayLimit, setDisplayLimit] = useState(24);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const allLoaded = showOnlyFavorites || displayLimit >= displayedPhotos.length;

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        displayLimit < displayedPhotos.length &&
        !showOnlyFavorites
      ) {
        setTimeout(() => {
          setDisplayLimit((prev) =>
            Math.min(prev + 24, displayedPhotos.length),
          );
        }, 300);
      }
    });
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
          <div className="relative z-10 flex flex-col items-center text-center">
            <Heart size={48} className="text-champagne-dark mb-2" />
            <p className="italic text-lg md:text-[22px] text-white mb-8 tracking-wide">
              Nenhuma foto favorita selecionada
            </p>
          </div>
          <button
            onClick={() => setShowOnlyFavorites(false)}
            className="flex items-center justify-center mx-auto px-8 py-3 rounded-full bg-champagne-dark text-slate-900 font-medium text-[10px] md:text-sm tracking-widest hover:scale-105 transition-all duration-100 ease-out shadow-xl overflow-hidden h-10 uppercase"
          >
            <span className="text-[10px] md:text-[12px] font-semibold whitespace-nowrap animate-in fade-in duration-100">
              Exibir todas as fotos
            </span>
          </button>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-4 pt-2 pb-2">
          <Gallery withCaption>
            <div
              key={showOnlyFavorites ? 'favorites-grid' : 'full-grid'}
              className={`gap-4 w-full ${
                showOnlyFavorites
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  : 'columns-1 sm:columns-2 md:columns-3 lg:columns-4'
              }`}
            >
              {limitedPhotos.map((photo, index) => {
                const isSelected = favorites.includes(photo.id);

                return (
                  <Item
                    key={photo.id}
                    original={getHighResImageUrl(photo.id)}
                    thumbnail={getImageUrl(photo.id, 'w600')}
                    width={photo.width}
                    height={photo.height}
                    caption={`${galleryTitle} - Foto ${index + 1}`}
                  >
                    {({ ref, open }) => (
                      <div
                        className={`relative mb-4 group break-inside-avoid shadow-sm hover:shadow-xl transition-shadow duration-500 rounded-2xl overflow-hidden bg-slate-100 ${
                          showOnlyFavorites
                            ? 'aspect-square sm:aspect-auto mb-0'
                            : ''
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
                          <Image
                            src={getImageUrl(photo.id, 'w600')}
                            alt={`Foto ${index + 1}`}
                            width={photo.width}
                            height={photo.height}
                            style={{
                              width: '100%',
                              height: showOnlyFavorites ? '100%' : 'auto',
                              aspectRatio: showOnlyFavorites
                                ? '1/1'
                                : `${photo.width}/${photo.height}`,
                              objectFit: 'cover',
                            }}
                            className="relative z-10 transition-opacity duration-700 opacity-0"
                            onLoad={(e) =>
                              e.currentTarget.classList.remove('opacity-0')
                            }
                            unoptimized
                            loading="lazy"
                          />
                        </a>

                        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-30 pointer-events-none">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFavoriteFromGrid(photo.id);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all pointer-events-auto shadow-md ${
                              isSelected
                                ? 'bg-[#E67E70]'
                                : 'bg-black/30 backdrop-blur-md border border-white/20'
                            }`}
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
                              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all pointer-events-auto hover:bg-[#25D366] shadow-md"
                            >
                              <MessageCircle size={18} className="text-white" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                window.open(
                                  getHighResImageUrl(photo.id),
                                  '_blank',
                                );
                              }}
                              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all pointer-events-auto hover:bg-white group/dl shadow-md"
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

          {/* Área de Sentinela e Loading */}
          {!showOnlyFavorites && (
            <div className="w-full">
              {!allLoaded && (
                <div className="py-20 flex justify-center">
                  <LoadingSpinner size="md" />
                </div>
              )}
              <div ref={sentinelRef} className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MasonryGrid;
