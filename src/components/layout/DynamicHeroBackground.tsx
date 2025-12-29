'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const heroImages = [
  '/hero-bg-1.webp', '/hero-bg-2.webp', '/hero-bg-3.webp',
  '/hero-bg-4.webp', '/hero-bg-5.webp', '/hero-bg-6.webp',
  '/hero-bg-7.webp', '/hero-bg-8.webp', '/hero-bg-9.webp',
  '/hero-bg-10.webp', '/hero-bg-11.webp', '/hero-bg-12.webp'
];

export default function DynamicHeroBackground() {
  // Inicializamos com um valor fixo ou sorteado imediatamente para evitar o delay do useEffect
  const [bgImage, setBgImage] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Sorteio síncrono para evitar frames em branco
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    setBgImage(heroImages[randomIndex]);
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-black">
      {/* Overlay de gradiente fixo (aparece instantaneamente) */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/90 via-black/40 to-black/95" />
      
      {/* Usamos uma div de fundo com placeholder de cor enquanto a imagem carrega */}
      <div className="absolute inset-0 bg-[#1a1a1a]" />

      {bgImage && (
        <Image
          src={bgImage}
          alt="Background Editorial"
          fill
          priority // Prioridade máxima no motor de renderização
          quality={75}
          onLoad={() => setIsLoaded(true)}
          // Removido o blur pesado que pode atrasar a renderização em GPUs mais lentas
          className={`
            object-cover object-[50%_30%] 
            transition-all duration-700 ease-out
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
          `}
          sizes="100vw"
        />
      )}
    </div>
  );
}