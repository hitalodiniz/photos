'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Camera, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

interface EditorialHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  showBackButton?: boolean;
  bgImage?: string;
}

export default function EditorialHeader({
  title,
  subtitle,
  showBackButton = true,
  bgImage,
}: EditorialHeaderProps) {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [originUrl, setOriginUrl] = useState<string | null>(null);

  const currentBg = useMemo(() => {
    if (bgImage) return bgImage;
    const randomIndex = Math.floor(Math.random() * heroImages.length);
    return heroImages[randomIndex];
  }, [bgImage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      if (referrer && referrer.includes(window.location.host)) {
        setOriginUrl(referrer);
      }
    }
  }, []);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    originUrl ? router.push(originUrl) : router.push('/');
  };

  return (
    <header className="relative w-full h-[21vh] md:h-[30vh] overflow-hidden bg-black font-montserrat flex-none">
      {/* 🎯 CAMADA 1: BACKGROUND (Padrão GaleriaHero) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
        <div className="absolute inset-0 z-[5] backdrop-blur-[1px]" />

        <Image
          src={currentBg}
          alt="Background Editorial"
          fill
          priority
          quality={85}
          onLoad={() => setIsLoaded(true)}
          className={`
            object-cover object-[50%_35%] 
            transition-all duration-[1200ms] ease-in-out
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105 blur-xl'}
          `}
        />
      </div>

      {/* 🎯 CAMADA 2: INTERFACE (Voltar) */}
      {showBackButton && originUrl && (
        <div className="absolute left-6 top-6 md:top-10 z-[50]">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 bg-petroleum text-white backdrop-blur-xl border border-white/10 rounded-full transition-all duration-300 group hover:bg-gold hover:text-black shadow-2xl"
          >
            <Home
              size={14}
              className="group-hover:scale-110 transition-transform"
            />

            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase">
              Início
            </span>
          </button>
        </div>
      )}

      {/* 🎯 CAMADA 3: CONTEÚDO (Alinhado à Esquerda igual GaleriaHero) */}
      <div className="relative z-20 h-full max-w-[1600px] mx-auto w-full px-8 pb-12 flex flex-col justify-end">
        <div
          className={`flex flex-col items-start text-left transition-all duration-[1200ms] delay-300 ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
          }`}
        >
          {/* Título e Ícone em Linha */}
          <div className="flex flex-col mb-4 w-full">
            <h1 className="font-artistic font-semibold text-white leading-tight tracking-normal flex items-center gap-4 drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] text-2xl md:text-5xl italic">
              <a href="/">
                <Camera
                  className="text-[#F3E5AB] shrink-0 w-8 h-8 md:w-14 md:h-14 drop-shadow-md"
                  strokeWidth={1.2}
                />
              </a>
              <span className="drop-shadow-lg">{title}</span>
            </h1>

            {/* LINHA DECORATIVA (Marca registrada Altar - Alinhada à esquerda) */}
            <div className="h-[2px] md:h-[3px] bg-[#F3E5AB] rounded-full mt-3 md:mt-4 w-full max-w-[150px] md:max-w-[300px] shadow-lg shadow-black/50" />
          </div>

          {/* Subtítulo */}
          {subtitle && (
            <div className="text-[12px] md:text-[18px] text-white/90 tracking-[0.05em] font-medium max-w-2xl leading-relaxed italic animate-in fade-in duration-1000 delay-500">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
