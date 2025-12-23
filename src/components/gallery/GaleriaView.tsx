'use client';
import React from 'react';
import { PhotoGrid } from '@/components/gallery';
import type { Galeria } from '@/types/galeria';

interface GaleriaViewProps {
  galeria: Galeria;
  photos: any[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  // Função para tratar a URL da capa
  const getCoverUrl = (fileId: string) => {
    if (!fileId) return '/hero-bg.jpg';
    // Otimizado para capa (w1000) com fallback para o ID correto
    return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
  };

  return (
    <div className="relative min-h-screen font-sans bg-[#F1F3F4]">


      {/* 1. HERO SECTION COMPACTA */}
      <section className="relative md:h-[30vh] -full flex flex-col items-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover"
          style={{
            backgroundPosition: 'center 40%',
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, rgba(241,243,244,1) 100%), url('${getCoverUrl(galeria.cover_image_url)}')`
          }}
        />

        {/* CONTEÚDO (Título centralizado e subido) */}
        <div className="relative z-10 w-full max-w-6xl text-center flex flex-col items-center pt-8 md:pt-12">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white italic leading-tight drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] px-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {galeria.title}
          </h1>

          {/* A Barra de Informações agora é renderizada dentro do PhotoGrid 
              para que o botão de download tenha acesso aos dados do ZIP */}
        </div>
      </section>

      {/* 2. MAIN CONTENT (Grid + Barra de Info) */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-6 pb-20 -mt-12 md:-mt-16">
        <PhotoGrid
          photos={photos}
          galeria={galeria}
        />
      </main>

      {/* Camada de fundo fixa */}
      <div className="fixed inset-0 z-[-1] bg-[#F1F3F4]"></div>
    </div>
  );
}