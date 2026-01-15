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

export default function DynamicHeroBackground({
  bgImage,
}: {
  bgImage?: string;
}) {
  // Renomeamos o estado para evitar conflito com a prop
  const [currentBg, setCurrentBg] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Lógica: Se existe bgImage (vinda do banco), usamos ela.
    // Se não, sorteamos uma das imagens padrão.
    if (bgImage) {
      setCurrentBg(bgImage);
    } else {
      const randomIndex = Math.floor(Math.random() * heroImages.length);
      setCurrentBg(heroImages[randomIndex]);
    }
  }, [bgImage]); // Monitora se a imagem de fundo mudar (útil na prévia)

  return (
    <div className="fixed inset-0 z-0 bg-black">
      {/* Overlay de gradiente para garantir legibilidade dos textos */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/90 via-black/40 to-black/95" />

      {/* Background de fallback sólido enquanto carrega */}
      <div className="absolute inset-0 bg-[#1a1a1a]" />

      {currentBg && (
        <Image
          src={currentBg}
          alt="Background Editorial"
          fill
          priority
          quality={85}
          sizes="100vw"
          // Usamos a prop moderna onSelect para o estado de carregamento
          onLoad={() => setIsLoaded(true)}
          className={`
            object-cover object-[50%_30%] 
            transition-all duration-1000 ease-in-out
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
          `}
        />
      )}
    </div>
  );
}
