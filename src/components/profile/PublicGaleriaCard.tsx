'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Images, Globe, Lock, MapPin } from 'lucide-react';
import type { Galeria } from '@/core/types/galeria';
import { RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { formatDateLong } from '@/core/utils/data-helpers';
import { useSegment } from '@/hooks/useSegment';
import { GALLERY_CATEGORIES } from '@/core/config/categories';

export function PublicGaleriaCard({ galeria }: { galeria: Galeria }) {
  const { SegmentIcon } = useSegment();
  const [mounted, setMounted] = useState(false);

  const {
    imgSrc: imageUrl,
    imgRef,
    handleLoad,
    handleError,
  } = useGoogleDriveImage({
    photoId: galeria.cover_image_url || '',
    width: RESOLUTIONS.THUMB,
    priority: false,
    fallbackToProxy: true,
  });

  useEffect(() => setMounted(true), []);

  const href = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return '#';
    return `/${galeria.photographer?.username.toLowerCase()}/${galeria.slug}`;
  }, [mounted, galeria]);

  return (
    <div className="group relative overflow-hidden rounded-xl bg-zinc-950 aspect-video md:aspect-[3/2] transition-all duration-500">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full"
      >
        {/* Imagem de Fundo */}
        <div className="absolute inset-0 z-0">
          <img
            ref={imgRef}
            src={imageUrl}
            alt={galeria.title}
            onLoad={handleLoad}
            onError={handleError}
            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/40 to-transparent" />
        </div>

        {/* Conteúdo do Card */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4">
          {/* Topo: Badge Status e Categoria */}
          <div className="flex justify-between items-start">
            {/* Badge de Categoria Dinâmico */}
            {galeria.category && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/20 text-[9px] font-semibold tracking-widest uppercase">
                <div className="w-1 h-1 rounded-full bg-gold animate-pulse" />
                {galeria.category}
              </span>
            )}

            {/* Ícone de cadeado se não for pública (opcional, para consistência) */}
            {!galeria.is_public && (
              <div className="p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                <Lock size={12} className="text-gold" />
              </div>
            )}
          </div>
          {/* Topo: Badge Status */}
          <div className="flex justify-start"></div>

          {/* Base: Título e Informações */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="flex items-center gap-3 text-white text-xl md:text-2xl font-semibold leading-tight group-hover:text-champagne transition-colors drop-shadow-lg">
                <SegmentIcon
                  size={28}
                  strokeWidth={1.5}
                  className="shrink-0 text-champagne group-hover:text-champagne transition-all"
                />
                <span className="truncate">{galeria.title}</span>
              </h3>

              {/* Linha Decorativa (Abaixo do conjunto ícone+título) */}
              <div className="h-[2px] bg-gold/80 w-16 group-hover:w-full transition-all duration-700 rounded-full" />
            </div>

            <div className="flex items-end justify-between">
              {/* Infos de Local e Data */}
              <div className="flex flex-col gap-1.5 text-zinc-300 text-[11px] md:text-xs font-medium">
                {galeria.location && (
                  <span className="flex items-center gap-2">
                    <MapPin size={14} className="text-champagne" />
                    {galeria.location}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Calendar size={14} className="text-champagne" />
                  {formatDateLong(galeria.date)}
                </span>
              </div>

              {/* Botão de Ação (Estilo Original Refinado) */}
              <div className="flex items-center gap-2 text-champagne text-[10px] font-bold tracking-[0.2em] opacity-80 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                <Images size={18} />
                <span className="hidden xs:inline">VER FOTOS</span>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
