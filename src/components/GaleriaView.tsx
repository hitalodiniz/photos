'use client';
import React from 'react';
import { Camera, Download, MapPin, Calendar, ImageIcon } from 'lucide-react';
import PhotoGrid from './PhotoGrid';
import type { Galeria } from '@/types/galeria';


interface GaleriaViewProps {
  galeria: Galeria;
  photos: any[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  const getCoverUrl = (fileId: string) => {
    if (!fileId) return '/hero-bg.jpg';
    // ✅ Otimizado para capa (equilíbrio entre nitidez e peso)
    return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
  };

  return (
    <div className="relative min-h-screen font-sans bg-[#F1F3F4]">

      {/* 1. HERO SECTION COMPACTA  */}
      <section className="relative min-h-[350px] md:h-[45vh] md:min-h-[300px] w-full flex flex-col items-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover"
          style={{
            backgroundPosition: 'center 40%',
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, rgba(241,243,244,1) 100%), url('${getCoverUrl(galeria.cover_image_url)}')`
          }}
        />

        {/* CONTEÚDO (pt-20 para subir bem o título) */}

        <div className="relative z-10 w-full max-w-6xl px-6 pt-6 md:pt-20 text-center flex flex-col items-center">

          {/* Título Artístico */}
          <h1
            className="text-3xl md:text-5xl font-bold text-white italic mb-8 md:mb-6 leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] px-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {galeria.title}
          </h1>

          {/* BARRA DE INFORMAÇÕES - UNIFICADA */}
<div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 bg-black/45 backdrop-blur-lg p-5 md:p-2.5 md:px-6 rounded-[2.5rem] md:rounded-full border border-white/10 shadow-2xl inline-flex w-auto max-w-[95%] md:max-w-max mx-auto transition-all">

            {/* GRUPO 1: Status e Fotos */}
            <div className="flex items-center gap-4 text-white text-xs md:text-sm font-medium italic">
              <div className="flex items-center gap-2">
                <Camera className="text-[#F3E5AB] w-4 h-4" />
                <span className="whitespace-nowrap uppercase tracking-widest text-[10px] md:text-xs">
                  {galeria.is_public ? 'Galeria Pública' : 'Acesso Restrito'}
                </span>
              </div>

              <div className="flex items-center gap-2 border-l border-white/20 pl-4">
                <ImageIcon size={14} className="text-[#F3E5AB]" />
                <span className="whitespace-nowrap italic">{photos.length} fotos</span>
              </div>
            </div>

            {/* Divisor Visual Desktop */}
            <div className="hidden md:block w-[1px] h-4 bg-white/20"></div>

            {/* GRUPO 2: Data e Local */}
            <div className="flex items-center gap-4 text-white text-xs md:text-sm font-medium italic">
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Calendar size={14} className="text-[#F3E5AB]" />
                {new Date(galeria.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>

              {galeria.location && (
                <span className="flex items-center gap-2 border-l border-white/20 pl-4 whitespace-nowrap max-w-[120px] md:max-w-[300px] truncate">
                  <MapPin size={14} className="text-[#F3E5AB]" /> {galeria.location}
                </span>
              )}
            </div>

            {/* Botão de Download */}
            <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#F3E5AB] hover:bg-[#e6d595] text-slate-900 px-6 py-3 md:py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-[11px] tracking-widest md:ml-2 whitespace-nowrap uppercase">
              <Download size={16} />
              Baixar todas
            </button>
          </div>
        </div>
      </section>

      {/* 2. GRID DE FOTOS - Encostado na capa para eliminar o espaço em branco */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-6 pb-20 -mt-10">
        <PhotoGrid
          photos={photos}
          galleryTitle={galeria.title}
          location={galeria.location || ''}
        />
      </main>

      {/* Camada de fundo fixa para o grid */}
      <div className="fixed inset-0 z-[-1] bg-[#F1F3F4]"></div>
    </div>
  );
}