'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Download, Heart } from 'lucide-react';

// Novas importações do PhotoSwipe
import 'photoswipe/dist/photoswipe.css';
import { Gallery, Item } from 'react-photoswipe-gallery';

interface Photo {
  id: string;
  url: string;
  width: number;
  height: number;
}

interface MasonryGridProps {
  galleryTitle: string;
  displayedPhotos: Photo[];
  favorites: string[];
  toggleFavoriteFromGrid: (id: string) => void;
  setSelectedPhotoIndex: (index: number) => void;
  photos: Photo[];
  showOnlyFavorites: boolean;
  setShowOnlyFavorites: (value: boolean) => void;
}

const getImageUrl = (
  photoId: string | number,
  suffix: string = 'w800',
  quality: number = 30,
) => `https://lh3.googleusercontent.com/d/${photoId}=${suffix}-q${quality}`;

const getHighResImageUrl = (photoId: string | number) =>
  `https://lh3.googleusercontent.com/d/${photoId}=s0`;

const getDownloadFileName = (index: number, galleryTitle: string) => {
  const cleanTitle = galleryTitle.replace(/[^a-zA-Z0-9 ]/g, '');
  const shortTitle = cleanTitle.substring(0, 20).replace(/\s+/g, '-');
  return `foto-${index + 1}-${shortTitle}.jpg`;
};

const MasonryGrid = ({
  galleryTitle,
  displayedPhotos,
  favorites,
  toggleFavoriteFromGrid,
  setSelectedPhotoIndex,
  photos,
  showOnlyFavorites,
  setShowOnlyFavorites,
}: MasonryGridProps) => {
  const [displayLimit, setDisplayLimit] = useState(24);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        !isLoading &&
        displayLimit < displayedPhotos.length
      ) {
        setIsLoading(true);
        setTimeout(() => {
          setDisplayLimit((prev) =>
            Math.min(prev + 24, displayedPhotos.length),
          );
          setIsLoading(false);
        }, 800);
      }
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [displayLimit, displayedPhotos.length, isLoading]);

  const limitedPhotos = displayedPhotos.slice(0, displayLimit);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 pb-20">
      {showOnlyFavorites && displayedPhotos.length === 0 ? (
        <div className="text-center py-20 text-[#D4AF37] text-[36px]">
          <p className="italic font-serif text-lg">
            Nenhuma foto favorita selecionada.
          </p>
          <button
            onClick={() => setShowOnlyFavorites(false)}
            className="px-8 py-3 rounded-full bg-[#F3E5AB] text-slate-900 font-semibold text-sm md:text-[14px] tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95"
          >
            Ver todas as fotos
          </button>
        </div>
      ) : (
        <>
          {/* Implementação do PhotoSwipe Gallery */}
          <Gallery withCaption>
            <div
              key={showOnlyFavorites ? 'favorites-grid' : 'full-grid'}
              className={`gap-4 mx-auto ${
                showOnlyFavorites
                  ? 'flex flex-wrap justify-start items-start'
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
                        className={`relative mb-4 group ${
                          showOnlyFavorites
                            ? 'flex-grow h-[250px] md:h-[300px] w-auto'
                            : 'inline-block w-full break-inside-avoid-column'
                        }`}
                        style={
                          showOnlyFavorites
                            ? {
                                flexBasis: `${(photo.width * 300) / photo.height}px`,
                              }
                            : {}
                        }
                      >
                        <a
                          href="#"
                          ref={ref as React.MutableRefObject<HTMLAnchorElement>}
                          onClick={(e) => {
                            e.preventDefault();
                            // CHAMA O SEU LIGHTBOX CUSTOMIZADO
                            setSelectedPhotoIndex(index);
                          }}
                          className="block cursor-zoom-in relative overflow-hidden rounded-2xl bg-slate-100 z-10"
                        >
                          <div className="absolute inset-0 z-0 flex items-center justify-center animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200">
                            <div className="w-5 h-5 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
                          </div>

                          <Image
                            src={getImageUrl(photo.id, 'w600')}
                            alt={`Foto ${index + 1}`}
                            width={photo.width}
                            height={photo.height}
                            style={{
                              aspectRatio: `${photo.width} / ${photo.height}`,
                            }}
                            className="relative z-10 rounded-2xl w-full h-auto object-cover transition-opacity duration-1000 opacity-0"
                            onLoad={(e) => {
                              const img = e.currentTarget;
                              if (img.complete) {
                                img.classList.remove('opacity-0');
                                const skeleton =
                                  img.parentElement?.querySelector(
                                    '.animate-pulse',
                                  );
                                if (skeleton) skeleton.classList.add('hidden');
                              }
                            }}
                            loading="lazy"
                          />
                        </a>

                        {/* Botões mantidos com z-index alto para clique instantâneo */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavoriteFromGrid(photo.id);
                          }}
                          className={`absolute top-2 left-2 z-[50] w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer pointer-events-auto ${
                            isSelected
                              ? 'bg-[#E67E70] border-transparent shadow-lg scale-110'
                              : 'bg-black/40 border-white/20 hover:bg-black/60 hover:scale-110'
                          }`}
                        >
                          <Heart
                            size={16}
                            fill={isSelected ? 'white' : 'none'}
                            className="text-white"
                          />
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const response = await fetch(
                              getHighResImageUrl(photo.id),
                            );
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = getDownloadFileName(
                              index,
                              galleryTitle,
                            );
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="absolute top-2 right-2 z-[50] w-8 h-8 md:w-10 md:h-10 rounded-full border bg-black/40 border-white/20 flex items-center justify-center hover:scale-110 transition-all pointer-events-auto cursor-pointer"
                        >
                          <Download size={16} className="text-white" />
                        </button>

                        {isSelected && (
                          <div className="absolute inset-0 border-2 border-[#E67E70] rounded-2xl pointer-events-none z-20" />
                        )}
                      </div>
                    )}
                  </Item>
                );
              })}
            </div>
          </Gallery>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-[#F3E5AB]/20" />
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#F3E5AB] animate-spin" />
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-[#F3E5AB]/60 font-medium">
                Carregando memórias
              </p>
            </div>
          )}

          <div ref={sentinelRef} />
        </>
      )}
    </div>
  );
};

export default MasonryGrid;
