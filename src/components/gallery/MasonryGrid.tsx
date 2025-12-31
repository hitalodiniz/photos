'use client';
import React, { useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import { Download, Heart } from 'lucide-react';
import LightGallery from 'lightgallery/react';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';

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
}: MasonryGridProps) => {
  const [displayLimit, setDisplayLimit] = useState(24);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Scroll infinito
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
    <div className="w-full max-w-[1600px] mx-auto px-4">
      {showOnlyFavorites && displayedPhotos.length === 0 ? (
        <div className="text-center py-20 text-[#D4AF37]">
          <p className="italic font-serif text-lg text-slate-500">
            Nenhuma foto favorita selecionada.
          </p>
        </div>
      ) : (
        <>
          <LightGallery
            speed={500}
            plugins={[lgThumbnail, lgZoom]}
            selector="a"
          >
            {/* Masonry por colunas responsivas */}
            <div
              className="
                columns-1 sm:columns-2 md:columns-3 lg:columns-4
                gap-2
              "
            >
              {limitedPhotos.map((photo, index) => {
                const isSelected = favorites.includes(photo.id);

                return (
                  <div
                    key={photo.id}
                    className="masonry-item relative inline-block w-full mb-4 break-inside-avoid-column group"
                  >
                    {/* Trigger da foto */}
                    <a
                      href={getImageUrl(photo.id, 'w800')}
                      data-src={getImageUrl(photo.id, 'w800')}
                      onClick={(e) => {
                        e.preventDefault(); // impede LG padrão
                        setSelectedPhotoIndex(index); // sincroniza com seu lightbox customizado
                      }}
                      className="block cursor-zoom-in relative overflow-hidden rounded-2xl bg-slate-200"
                    >
                      <div className="absolute inset-0 z-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
                      <Image
                        src={getImageUrl(photo.id, 'w600')}
                        alt={`Foto ${index + 1}`}
                        width={photo.width}
                        height={photo.height}
                        style={{
                          aspectRatio: `${photo.width} / ${photo.height}`,
                        }}
                        className="relative z-10 rounded-2xl w-full h-auto object-cover transition-opacity duration-700 opacity-0 group-hover:scale-[1.01]"
                        // Lógica robusta para remover o skeleton
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          if (img.complete) {
                            img.classList.remove('opacity-0');
                            // Busca o skeleton no mesmo container pai e o esconde
                            const container = img.parentElement;
                            const skeleton =
                              container?.querySelector('.animate-pulse');
                            if (skeleton) skeleton.classList.add('hidden');
                          }
                        }}
                        loading="lazy"
                        placeholder="blur"
                        // Gera um borrão minúsculo baseado na própria imagem enquanto carrega
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                        onError={(e) => {
                          e.currentTarget.src = '/fallback.png';
                        }}
                        srcSet={`
                          ${getImageUrl(photo.id, 'w400')} 400w,
                          ${getImageUrl(photo.id, 'w600')} 600w,
                          ${getImageUrl(photo.id, 'w800')} 800w,
                          ${getImageUrl(photo.id, 'w1200')} 1200w
                        `}
                        sizes="(max-width: 640px) 100vw,
                               (max-width: 1024px) 50vw,
                               (max-width: 1280px) 33vw,
                               25vw"
                      />
                    </a>

                    {/* Botão de coração */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavoriteFromGrid(photo.id);
                      }}
                      className={`
                        absolute top-2 left-2 md:top-2 md:left-2 z-30
                        w-8 h-8 md:w-10 md:h-10 rounded-full border
                        flex items-center justify-center transition-all
                        ${
                          isSelected
                            ? 'bg-[#E67E70] border-transparent shadow-lg'
                            : 'bg-black/40 border-white/20'
                        }
                      `}
                    >
                      <Heart
                        size={16}
                        fill={isSelected ? 'white' : 'none'}
                        className="text-white"
                      />
                    </button>

                    {/* Botão de download */}
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
                      className="absolute top-2 right-2 md:top-2 md:right-2 z-30
                        w-8 h-8 md:w-10 md:h-10 rounded-full border
                        flex items-center justify-center transition-all
                        bg-black/40 border-white/20 hover:bg-black/40"
                    >
                      <Download size={16} className="text-white" />
                    </button>

                    {/* Borda de seleção */}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-[#E67E70] rounded-2xl pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </LightGallery>

          {/* Spinner de carregamento elegante */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-700">
              <div className="relative w-12 h-12">
                {/* Círculo de fundo suave */}
                <div className="absolute inset-0 rounded-full border-2 border-[#F3E5AB]/20"></div>

                {/* Arco de brilho principal (Champanhe) */}
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#F3E5AB] animate-spin shadow-[0_0_15px_rgba(243,229,171,0.4)]"></div>

                {/* Ponto de luz pulsante no centro */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-[#F3E5AB] rounded-full animate-pulse shadow-[0_0_10px_#F3E5AB]"></div>
                </div>
              </div>

              {/* Texto sutil de status */}
              <p className="mt-4 text-[11px] md:text-[14px] uppercase tracking-[0.2em] text-[#F3E5AB]/60 font-medium">
                Carregando memórias
              </p>
            </div>
          )}

          {/* Sentinela invisível para scroll infinito */}
          <div ref={sentinelRef} />
        </>
      )}
    </div>
  );
};

export default MasonryGrid;
