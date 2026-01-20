'use client';
import React, { useRef, useEffect } from 'react';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { RESOLUTIONS } from '@/core/utils/url-helper';

interface ThumbnailStripProps {
  photos: Array<{ id: string | number }>;
  activeIndex: number;
  onNavigateToIndex: (index: number) => void;
  isVisible: boolean;
}

export function ThumbnailStrip({
  photos,
  activeIndex,
  onNavigateToIndex,
  isVisible,
}: ThumbnailStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  // Scroll para manter a miniatura ativa visível
  useEffect(() => {
    if (activeThumbRef.current && containerRef.current) {
      const thumb = activeThumbRef.current;
      const container = containerRef.current;
      const thumbLeft = thumb.offsetLeft;
      const thumbWidth = thumb.offsetWidth;
      const containerWidth = container.offsetWidth;
      const currentScrollLeft = container.scrollLeft;
      const scrollRight = currentScrollLeft + containerWidth;

      // Se a miniatura ativa está fora da área visível, centraliza
      if (thumbLeft < currentScrollLeft || thumbLeft + thumbWidth > scrollRight) {
        container.scrollTo({
          left: thumbLeft - containerWidth / 2 + thumbWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeIndex]);

  return (
    <div
      data-thumbnail-strip
      className={`fixed bottom-0 left-0 right-0 z-[450] bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-4 pb-2 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Container simples - apenas miniaturas */}
      <div className="w-full pb-10 px-4">
        <div
          ref={containerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
        {photos.map((photo, index) => {
          const isActive = index === activeIndex;
          return (
            <ThumbnailItem
              key={photo.id}
              photoId={photo.id}
              index={index}
              isActive={isActive}
              onClick={() => onNavigateToIndex(index)}
              ref={isActive ? activeThumbRef : null}
            />
          );
        })}
        </div>
      </div>
    </div>
  );
}

interface ThumbnailItemProps {
  photoId: string | number;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

const ThumbnailItem = React.forwardRef<HTMLButtonElement, ThumbnailItemProps>(
  ({ photoId, index, isActive, onClick }, ref) => {
    // Garantir que photoId não seja vazio
    const validPhotoId = photoId ? String(photoId) : '';
    
    const { imgSrc, isLoading, handleError, handleLoad } = useGoogleDriveImage({
      photoId: validPhotoId,
      width: '300', // Resolução mínima para miniaturas (otimiza cache e performance)
      priority: index < 10, // Prioriza as primeiras 10
      fallbackToProxy: true,
      useProxyDirectly: false, // Tenta cache do navegador primeiro
    });

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`relative flex-shrink-0 transition-all duration-300 cursor-pointer touch-manipulation ${
          isActive
            ? 'ring-2 ring-[#F3E5AB] ring-offset-2 ring-offset-black scale-110 z-10 shadow-lg shadow-[#F3E5AB]/30'
            : 'opacity-70 hover:opacity-100 active:opacity-100 hover:scale-105 active:scale-95'
        }`}
        style={{
          width: isActive ? '80px' : '64px',
          height: isActive ? '80px' : '64px',
        }}
        aria-label={`Ver foto ${index + 1}`}
      >
        <div className={`relative w-full h-full rounded-lg overflow-hidden bg-white/10 transition-all ${
          isActive ? 'border-2 border-[#F3E5AB]' : 'border-2 border-transparent'
        }`}>
          {isLoading && !imgSrc ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt={`Miniatura ${index + 1}`}
              className="w-full h-full object-cover"
              loading={index < 10 ? 'eager' : 'lazy'}
              draggable={false}
              onError={handleError}
              onLoad={handleLoad}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {/* Indicador de foto ativa - overlay dourado */}
          {isActive && (
            <div className="absolute inset-0 bg-[#F3E5AB]/10 pointer-events-none" />
          )}
        </div>
      </button>
    );
  }
);

ThumbnailItem.displayName = 'ThumbnailItem';
