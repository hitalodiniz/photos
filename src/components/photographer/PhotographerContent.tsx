'use client';
import React, { useState, useEffect } from 'react';
import { Footer } from '@/components/layout';
import LoadingScreen from '../ui/LoadingScreen';
import { PhotographerAvatar, PhotographerBio } from './PhotographerHero';
import { PhotographerInfoBar } from './PhotographerInfoBar';
import { EditorialHero } from '../ui/EditorialHero';
import { usePageTitle } from '@/hooks/usePageTitle';

interface ProfileContentProps {
  fullName: string;
  username: string;
  miniBio: string;
  phone: string;
  instagram: string;
  website?: string;
  photoPreview: string | null;
  cities: string[];
  backgroundUrl?: string;
}

export default function PhotographerContent({
  fullName,
  miniBio,
  phone,
  instagram,
  website,
  photoPreview,
  cities,
  backgroundUrl,
}: ProfileContentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Lógica de Scroll para a InfoBar
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });

    if (fullName) {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fullName]);

  const isScrolled = scrollY > 100;

  return (
    <div className="relative min-h-screen bg-black font-sans overflow-x-hidden">
      {/* 1. LOADING LAYER */}
      <LoadingScreen fadeOut={!isLoading} message="Consolidando perfil" />

      {/* HERO SECTION - O Editorial apenas provê o fundo e a lógica de altura */}

      <EditorialHero
        title={fullName}
        coverUrl={backgroundUrl}
        sideElement={<PhotographerAvatar photoPreview={photoPreview} />} // O Avatar fica ao lado do Título
      >
        <PhotographerBio miniBio={miniBio} cities={cities} />{' '}
        {/* A Bio fica abaixo do Título */}
      </EditorialHero>
      {/* INFOBAR ADAPTADA (Sticky e flutuante no scroll) */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative z-50"
      >
        <PhotographerInfoBar
          phone={phone}
          instagram={instagram}
          website={website}
          cities={cities}
          isScrolled={isScrolled}
          isHovered={isHovered}
        />
      </div>

      {/* ESPAÇADOR PARA CONTEÚDO ADICIONAL NO FUTURO */}
      <main className="relative z-30 max-w-[1600px] mx-auto px-6 py-20 min-h-[40vh]">
        {/* Aqui você poderá futuramente listar galerias em destaque ou portfólio fixo */}
        <div className="flex flex-col items-center justify-center text-[#F3E5AB]">
          <div className="w-px h-24 bg-gradient-to-b from-[#F3E5AB] to-transparent mb-8" />
          <p className="text-[10px] uppercase tracking-[0.5em]">
            Galeria de fotos públicas do usuário serão exibidas aqui.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
