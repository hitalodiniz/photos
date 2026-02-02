'use client';
import React, { useState, useEffect } from 'react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import Footer from '@/components/layout/Footer'; // Garanta a importação correta
import EditorialToolbar from './EditorialToolBar';

// 1. Definição das imagens disponíveis
const HERO_IMAGES = [
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

export default function EditorialView({
  title,
  subtitle,
  children,
  bgImage,
}: any) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentBg, setCurrentBg] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);

    // 2. Lógica de sorteio: se não vier uma bgImage via prop, sorteamos uma da lista
    const selected =
      bgImage || HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
    setCurrentBg(selected);
  }, [bgImage]);

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-petroleum overflow-x-hidden transition-all">
      <LoadingScreen message="Preparando..." fadeOut={isMounted} />
      <EditorialToolbar />

      <div
        className={`relative flex flex-col flex-grow transition-opacity duration-1000 ${isMounted ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* HERO SECTION */}
        <section className="relative h-[80vh] flex flex-col overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* 3. Renderização condicional: apenas exibe a imagem após o sorteio no cliente */}
            {currentBg && (
              <img
                src={currentBg}
                className={`w-full h-full object-cover transition-opacity duration-700 ${
                  currentBg ? 'opacity-85' : 'opacity-0'
                }`}
                style={{ objectPosition: 'center 40%' }}
                alt="Hero Background"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-70% via-petroleum/60 via-75% to-petroleum" />
          </div>

          {/* 🎯 TÍTULO ALINHADO: Removido max-w-4xl e px-16, usando o padrão do sistema */}
          <div className="absolute bottom-10 left-0 w-full z-10">
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col items-start">
              <div className="inline-block">
                <h1 className="text-2xl md:text-5xl font-semibold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]  italic">
                  {title}
                </h1>
                <div className="h-[2px] md:h-[3px] bg-gold rounded-full mt-2 shadow-lg w-full" />
              </div>

              <p className="text-white text-sm md:text-[14px] font-medium tracking-[0.15em] uppercase opacity-80 mt-6 drop-shadow-md">
                {subtitle}
              </p>
            </div>
          </div>
          {/* Gradiente sutil apenas na base do Hero para transição suave */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-petroleum to-transparent" />
        </section>

        {/* MAIN CONTENT: Padrão [1600px] e px-6/12 */}
        <main className="relative z-10 bg-petroleum flex-grow">
          <div className="max-w-[1600px] mx-auto px-6 md:px-12">{children}</div>
        </main>

        {/* FOOTER: Agora alinhado pelo componente interno */}
        <div className="bg-petroleum">
          <Footer />
        </div>
      </div>
    </div>
  );
}
