// components/PhotoGrid.tsx
'use client';
import React, { useState, useEffect } from 'react';
import Lightbox from './Lightbox';

interface PhotoGridProps {
  photos: any[];
  galleryTitle: string;
  location: string;
}

export default function PhotoGrid({ photos, galleryTitle, location }: PhotoGridProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState(12);

  // Função de URL corrigida com template literals ${}
  const getImageUrl = (photo: any) => {
    const fileId = typeof photo === 'string' ? photo : photo.id;
    if (!fileId) return "";
    // Uso do $ antes da chave para interpolação real
    return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
  };

  // Lógica de Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 100
      ) {
        setDisplayLimit((prev) => Math.min(prev + 12, photos.length));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [photos.length]);

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
        <p className="text-gray-400">Nenhuma foto encontrada nesta pasta.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Container de Colunas (Masonry Style) */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {photos.slice(0, displayLimit).map((photo, index) => {
          // Agora o bloco está correto com chaves { } e return ( )
          const src = getImageUrl(photo);
          if (!src) return null;

          return (
            <div
              key={photo.id || index}
              onClick={() => setSelectedPhotoIndex(index)}
              className="relative group overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-2xl transition-all duration-500 break-inside-avoid cursor-zoom-in mb-4"
            >
              <img
                src={src}
                alt="Foto da Galeria"
                className="w-full h-auto object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.parentElement?.style.setProperty('display', 'none');
                }}
                loading="lazy"
                decoding="async"
              />
              {/* Overlay sutil */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* Indicador de carregamento posicionado fora das colunas */}
      {displayLimit < photos.length && (
        <div className="flex justify-center py-10 w-full">
          <div className="animate-pulse text-gray-400 text-sm font-medium tracking-widest uppercase">
            Carregando mais fotos...
          </div>
        </div>
      )}

      {selectedPhotoIndex !== null && (
        <Lightbox
          photo={{
            ...photos[selectedPhotoIndex],
            url: `https://lh3.googleusercontent.com/d/$${photos[selectedPhotoIndex].id}=w1600` // Alta qualidade para o Lightbox
          }}
          totalPhotos={photos.length}
          currentNumber={selectedPhotoIndex + 1}
          galleryTitle={galleryTitle}
          location={location}
          onClose={() => setSelectedPhotoIndex(null)}
          onNext={() => setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length)}
          onPrev={() => setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length)}
        />
      )}
    </div>
  );
}