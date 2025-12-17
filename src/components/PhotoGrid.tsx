'use client';
import React, { useState } from 'react';
import { Download, Heart, Maximize2 } from 'lucide-react';
import Lightbox from './Lightbox';

export default function PhotoGrid() {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const photos = [
    { id: 1, url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?q=80&w=2070' },
    { id: 2, url: 'https://images.unsplash.com/photo-1492691523567-61723c295fe3?q=80&w=2070' },
    { id: 3, url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070' },
  ];

  const handleNext = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length);
    }
  };

  const handlePrev = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length);
    }
  };

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {photos.map((photo, index) => (
          <div 
            key={photo.id} 
            onClick={() => setSelectedPhotoIndex(index)}
            className="relative group overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-2xl transition-all duration-500 break-inside-avoid cursor-zoom-in"
          >
            <img 
              src={photo.url} 
              alt="Foto" 
              className="w-full h-auto object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            {/* ... overlay anterior aqui ... */}
          </div>
        ))}
      </div>

      {/* Renderiza o Lightbox se houver uma foto selecionada */}
      {selectedPhotoIndex !== null && (
        <Lightbox 
          photo={photos[selectedPhotoIndex]} 
          onClose={() => setSelectedPhotoIndex(null)}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </>
  );
}