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
    <div className="fixed inset-0 z-0 bg-black overflow-hidden">
      {/* 1. OVERLAY DE GRADIENTE (Identico à Galeria) */}
      {/* Ajustamos o gradiente para ser mais denso no topo e na base, como no Hero */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/80 via-black/20 to-black/90" />

      {/* 2. EFEITO DE BLUR (Backdrop-blur para suavizar o fundo dinâmico) */}
      <div className="absolute inset-0 z-[5] backdrop-blur-[2px]" />

      {/* 3. IMAGE LAYER */}
      {currentBg && (
        <Image
          src={currentBg}
          alt="Background Editorial"
          fill
          priority
          quality={90}
          sizes="100vw"
          onLoad={() => setIsLoaded(true)}
          className={`
            /* 🎯 O SEGREDO DO POSICIONAMENTO: 35% no eixo Y */
            object-cover object-[50%_35%] 
            transition-all duration-[1500ms] ease-in-out
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110 blur-2xl'}
          `}
        />
      )}
    </div>
  );
}
