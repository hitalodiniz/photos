'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const heroImages = [
  '/hero-bg-1.webp',
  '/hero-bg-2.webp',
  '/hero-bg-3.webp',
  '/hero-bg-4.webp',
  '/hero-bg-5.webp',
  '/hero-bg-6.webp',
  '/hero-bg-7.webp',
  '/hero-bg-8.webp',
  '/hero-bg-9.webp',
  '/hero-bg-10.webp',
  '/hero-bg-11.webp',
  '/hero-bg-12.webp',
];

export default function DynamicHeroBackground() {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Sorteio simples direto no mount
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    setBgImage(heroImages[randomIndex]);
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-black">
      {/* Overlay de gradiente */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/90 via-black/40 to-black/95" />

      {/* Background de fallback sólido */}
      <div className="absolute inset-0 bg-[#1a1a1a]" />

      {bgImage && (
        <Image
          src={bgImage}
          alt="Background Editorial"
          fill
          priority
          quality={85}
          sizes="100vw"
          // O segredo: usamos onLoadingComplete para garantir a captura do estado
          onLoadingComplete={() => setIsLoaded(true)}
          className={`
            object-cover object-[50%_30%] 
            transition-opacity duration-1000 ease-in-out
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
        />
      )}
    </div>
  );
}
