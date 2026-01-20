'use client';
import React, { useRef, useEffect } from 'react';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';

interface VerticalThumbnailsProps {
  photos: Array<{ id: string | number }>;
  activeIndex: number;
  onNavigateToIndex: (index: number) => void;
  isVisible: boolean;
}

export function VerticalThumbnails({
  photos,
  activeIndex,
  onNavigateToIndex,
  isVisible,
}: VerticalThumbnailsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  // Scroll para manter a miniatura ativa visível
  useEffect(() => {
    if (activeThumbRef.current && containerRef.current) {
      const thumb = activeThumbRef.current;
      const container = containerRef.current;
      const thumbTop = thumb.offsetTop;
      const thumbHeight = thumb.offsetHeight;
      const containerHeight = container.clientHeight;
      const currentScrollTop = container.scrollTop;
      const scrollBottom = currentScrollTop + containerHeight;

      // Se a miniatura ativa está fora da área visível, centraliza
      if (thumbTop < currentScrollTop || thumbTop + thumbHeight > scrollBottom) {
        container.scrollTo({
          top: thumbTop - containerHeight / 2 + thumbHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeIndex]);

  return (
    <div
      className={`fixed top-0 z-[200] bg-gradient-to-l from-black/95 via-black/80 to-transparent transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
      }`}
      onClick={(e) => e.stopPropagation()}
      style={{ 
        height: '100vh', // Altura total - passa por baixo do contador e toolbar
        top: 0,
        right: '0', // Borda direita da tela
        width: '96px', // w-20 (80px) + 15% = ~92px, arredondado para 96px (w-24)
      }}
    >
      <div
        ref={containerRef}
        className="flex flex-col gap-2 p-2"
        style={{
          height: '100vh', // Altura total - passa por baixo do contador e toolbar
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.3) transparent',
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
    const validPhotoId = photoId ? String(photoId) : '';
    
    const { imgSrc, isLoading, handleError, handleLoad } = useGoogleDriveImage({
      photoId: validPhotoId,
      width: '200', // Resolução mínima para miniaturas verticais
      priority: index < 20, // Prioriza as primeiras 20
      fallbackToProxy: true,
      useProxyDirectly: false,
    });

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`relative flex-shrink-0 transition-all duration-300 cursor-pointer w-full ${
          isActive
            ? 'ring-2 ring-[#F3E5AB] scale-105'
            : 'opacity-70 hover:opacity-100 hover:scale-105'
        }`}
        style={{
          aspectRatio: '1',
        }}
        aria-label={`Ver foto ${index + 1}`}
      >
        <div className={`relative w-full h-full rounded-lg overflow-hidden bg-white/10 transition-all ${
          isActive ? 'border-2 border-[#F3E5AB]' : 'border-2 border-transparent'
        }`}>
          {isLoading && !imgSrc ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt={`Miniatura ${index + 1}`}
              className="w-full h-full object-cover"
              loading={index < 20 ? 'eager' : 'lazy'}
              draggable={false}
              onError={handleError}
              onLoad={handleLoad}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {isActive && (
            <div className="absolute inset-0 bg-[#F3E5AB]/10 pointer-events-none" />
          )}
        </div>
      </button>
    );
  }
);

ThumbnailItem.displayName = 'ThumbnailItem';
