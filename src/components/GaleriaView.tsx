'use client';
import React from 'react';
import { Camera, Download, MapPin, Calendar } from 'lucide-react';
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

      {/* 1. HERO SECTION COMPACTA - h-[50vh] para reduzir o espaço da capa */}
      <section className="relative h-[50vh] min-h-[400px] w-full flex flex-col items-center overflow-hidden">
        {/* Background Image - 'center 20%' para subir a foto conforme solicitado */}
        <div
          className="absolute inset-0 z-0 bg-cover"
          style={{
            backgroundPosition: 'center 20%',
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 40%, rgba(241,243,244,1) 100%), url('${getCoverUrl(galeria.cover_image_url)}')`
          }}
        />

        {/* CONTEÚDO SUBIDO PARA O TOPO (pt-12) */}
        <div className="relative z-10 w-full max-w-6xl px-6 pt-12 text-center flex flex-col items-center">

          {/* Título Artístico */}
          <h1
            className="text-4xl md:text-6xl font-bold text-white tracking-tight drop-shadow-2xl italic mb-6 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {galeria.title}
          </h1>

          {/* BARRA HORIZONTAL (Igual ao seu print image_948cce) */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 bg-black/30 backdrop-blur-md p-3 px-6 rounded-full border border-white/10 shadow-xl inline-flex">

            {/* Tag Status */}
            <div className="flex items-center gap-2 md:border-r md:border-white/20 md:pr-4">
              <Camera className="text-[#F3E5AB] w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white whitespace-nowrap">
                Galeria Pública
              </span>
            </div>

            {/* Data e Local em linha */}
            <div className="flex items-center gap-4 text-white text-xs md:text-sm font-light italic">
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Calendar size={14} className="text-[#F3E5AB]" />
                {new Date(galeria.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              {galeria.location && (
                <span className="flex items-center gap-2 md:border-l md:border-white/20 md:pl-4 whitespace-nowrap">
                  <MapPin size={14} className="text-[#F3E5AB]" /> {galeria.location}
                </span>
              )}
            </div>

            {/* Botão de Download na mesma linha */}
            <button className="flex items-center gap-2 bg-[#1A73E8] hover:bg-[#174EA6] text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 uppercase text-[10px] tracking-widest md:ml-2">
              <Download size={16} />
              Baixar Todas
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