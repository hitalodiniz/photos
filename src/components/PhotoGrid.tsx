// components/PhotoGrid.tsx
'use client';
import React, { useState } from 'react';
import Lightbox from './Lightbox';

interface PhotoGridProps {
  photos: any[];
  galleryTitle: string;
  location: string;
}

export default function PhotoGrid({ photos, galleryTitle, location }: PhotoGridProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

const getImageUrl = (fileId: string) => {
  if (!fileId) return null;
  // ✅ Otimizado para miniaturas (carregamento instantâneo)
  return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
};

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
        <p className="text-gray-400">Nenhuma foto encontrada nesta pasta.</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {photos.map((photo, index) => {
          const src = getImageUrl(photo);

          if (!src) return null;

          return (
            <div
              key={photo.id || index}
              onClick={() => setSelectedPhotoIndex(index)}
              className="relative group overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-2xl transition-all duration-500 break-inside-avoid cursor-zoom-in"
            >
              <img
                src={src}
                alt={`Foto ${index + 1}`}
                loading="lazy"
                className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
                onError={(e) => {
                  // Fallback visual caso o Google bloqueie a imagem
                  e.currentTarget.src = "https://placehold.co/600x400?text=Erro+de+Permissao+no+Drive";
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
          );
        })}
      </div>

      {selectedPhotoIndex !== null && (
        <Lightbox
          photo={{
            ...photos[selectedPhotoIndex],
            url: getImageUrl(photos[selectedPhotoIndex]) || ""
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
    </>
  );
}