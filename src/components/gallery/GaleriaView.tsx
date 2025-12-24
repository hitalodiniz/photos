'use client';
import React from 'react';
import { PhotoGrid } from '@/components/gallery';
import type { Galeria } from '@/types/galeria';

interface GaleriaViewProps {
  galeria: Galeria;
  photos: any[];
}

export default function GaleriaView({ galeria, photos }: GaleriaViewProps) {
  // CORREÇÃO: Template literal com crase para a URL da capa funcionar
  const getCoverUrl = (fileId: string) => {
    if (!fileId) return '/hero-bg.jpg';
    return `https://lh3.googleusercontent.com/d/$${fileId}=w1000`;
  };

  return (
    <div className="relative min-h-screen font-sans bg-[#F1F3F4]">

      {/* 1. HERO SECTION COMPACTA */}
      <section className="relative md:h-[30vh] flex flex-col items-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover"
          style={{
            backgroundPosition: 'center 40%',
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, rgba(241,243,244,1) 100%), url('${getCoverUrl(galeria.cover_image_url)}')`
          }}
        />

        {/* CONTEÚDO (Título centralizado) */}
        <div className="relative z-10 w-full max-w-6xl text-center flex flex-col items-center pt-8 md:pt-12">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white italic leading-tight drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)] px-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {galeria.title}
          </h1>
        </div>
      </section>

      {/* 2. MAIN CONTENT (Grid de Fotos) */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-4 md:px-6 pb-20 -mt-12 md:-mt-16">
        {/* Verificação de segurança para renderização */}
        {photos && photos.length > 0 ? (
          <PhotoGrid
            photos={photos}
            galeria={galeria}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300 mb-4"></div>
            <p>Carregando memórias...</p>
          </div>
        )}
      </main>

      {/* Camada de fundo fixa */}
      <div className="fixed inset-0 z-[-1] bg-[#F1F3F4]"></div>

      {/* AVATAR DE ASSINATURA FLUTUANTE (FIXO À DIREITA) */}
      <div className="fixed top-8 right-6 md:top-12 md:right-12 z-[100] flex flex-col items-center md:items-end gap-3 animate-in fade-in slide-in-from-right-8 duration-1000 pointer-events-none">
        
        <div className="relative group pointer-events-auto">
          <div className="absolute -inset-1 bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] rounded-full blur opacity-25 group-hover:opacity-60 transition duration-700"></div>
          <img 
            src={galeria.photographer_avatar_url || "/default-avatar.jpg"} 
            className="relative w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-white object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105"
            alt={galeria.photographer_name || "Fotógrafo"}
          />
        </div>

        <div className="text-center md:text-right pointer-events-auto bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-xl min-w-[140px]">
          <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-semibold mb-0.5">Captured by</p>
          <a 
            href={`/${galeria.photographer_id}`} 
            className="text-base md:text-xl font-serif italic text-slate-900 hover:text-[#D4AF37] transition-all block mb-3"
          >
            {galeria.photographer_name}
          </a>

          <div className="flex items-center justify-center md:justify-end gap-3">
            {galeria.photographer_phone && (
              <a 
                href={`https://wa.me/${galeria.photographer_phone.replace(/\D/g, '')}`}
                target="_blank"
                className="p-2 bg-white/90 text-[#25D366] rounded-full hover:bg-[#25D366] hover:text-white transition-all shadow-md border border-white/40"
              >
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
            {galeria.photographer_instagram && (
              <a 
                href={`https://instagram.com/${galeria.photographer_instagram.replace('@', '')}`}
                target="_blank"
                className="p-2 bg-white/90 text-[#E4405F] rounded-full hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white transition-all shadow-md border border-white/40"
              >
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}