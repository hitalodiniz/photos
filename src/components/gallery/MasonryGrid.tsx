'use client';
import React, { memo, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Download, Heart, Loader2, MessageCircle } from 'lucide-react';
import 'photoswipe/dist/photoswipe.css';
import { Gallery, Item } from 'react-photoswipe-gallery';
import { Galeria } from '@/core/types/galeria';
import { getProxyUrl } from '@/core/utils/url-helper';
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
          // Reduzido para 100ms para resposta imediata ao chegar no limite de margem
          setTimeout(() => {
            setDisplayLimit((prev) =>
              Math.min(prev + qtdeFotos, displayedPhotos.length),
            );
          }, 100);
        }
      },
      {
        // SUBIR O SENTINELA: Carrega fotos quando o usuário ainda está a 1000px do fim
        rootMargin: '0px 0px 1000px 0px',
        threshold: 0.01,
      },
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
              className={`gap-4 w-full transition-all duration-700 ${
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
                    // Usa Proxy para evitar bloqueios no lightbox também
                    original={getProxyUrl(photo.id, '1600')}
                    thumbnail={getProxyUrl(photo.id, '600')}
                    width={photo.width}
                    height={photo.height}
                    caption={`${galleryTitle} - Foto ${index + 1}`}
                  >
                    {({ ref, open }) => (
                      <div
                        className={`relative mb-4 group break-inside-avoid shadow-sm hover:shadow-xl 
                        transition-all duration-1000 rounded-2xl overflow-hidden bg-slate-100 ${
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
                          <SafeImage
                            photoId={photo.id}
                            // OBRIGATÓRIO: Usar Proxy para evitar erro 429
                            src={getProxyUrl(photo.id, '400')}
                            index={index}
                            alt={`Foto ${index + 1}`}
                            width={photo.width}
                            height={photo.height}
                            priority={index < 4}
                            style={{
                              width: '100%',
                              height: showOnlyFavorites ? '100%' : 'auto',
                              aspectRatio: showOnlyFavorites
                                ? '1/1'
                                : `${photo.width}/${photo.height}`,
                              objectFit: 'cover',
                            }}
                            className="relative z-10"
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
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  getProxyUrl(photo.id, '0'),
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
    style,
    showOnlyFavorites,
    photoId,
    index,
    ...props
  }: any) => {
    const isAlreadyLoaded = loadedImagesCache.has(photoId);
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
      isAlreadyLoaded ? 'loaded' : 'loading',
    );

    const handleLoad = () => {
      loadedImagesCache.add(photoId);
      setStatus('loaded');
    };

    const handleError = () => {
      setStatus('error');
    };

    const aspect = showOnlyFavorites ? '1/1' : `${width}/${height}`;

    return (
      <div
        className={`relative w-full overflow-hidden bg-slate-100/50 flex items-center justify-center transition-all`}
        style={{
          aspectRatio: aspect,
          animation: isAlreadyLoaded ? 'none' : 'fadeInUp 2s ease-out forwards',
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(15px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `,
          }}
        />

        {/* LOADING STATE - Agora usando seu LoadingSpinner oficial */}
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/10 backdrop-blur-[2px]">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {status === 'error' ? (
          <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 p-4">
            <Camera size={24} className="mb-1 opacity-30" />
            <span className="text-[8px] uppercase font-bold text-center">
              Indisponível
            </span>
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            style={style}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={`${className} transition-opacity duration-[1500ms] ease-in-out ${
              status === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleLoad}
            onError={handleError}
            unoptimized
            {...props}
          />
        )}
      </div>
    );
  },
);

SafeImage.displayName = 'SafeImage';
export default MasonryGrid;
