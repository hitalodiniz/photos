'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  Lock,
  ArrowRight,
  Tag,
} from 'lucide-react';
import type { Galeria } from '@/core/types/galeria';
import { resolveGalleryUrl, RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { formatDateLong } from '@/core/utils/data-helpers';

export function PublicGaleriaCard({ galeria }: { galeria: Galeria }) {
  const [mounted, setMounted] = useState(false);
  
  // 🎯 FALLBACK: Tenta Google direto, se falhar usa Proxy
  const { imgSrc: imageUrl, imgRef, handleLoad, handleError } = useGoogleDriveImage({
    photoId: galeria.cover_image_url || '',
    width: RESOLUTIONS.THUMB, // 600px
    priority: false,
    fallbackToProxy: true,
  });
  const photographer = galeria.photographer;
  useEffect(() => {
    setMounted(true);
  }, []);

  const href = useMemo(() => {
    // 1. Só gera a URL se tivermos o fotógrafo (vido da query) e estivermos no cliente
    if (!mounted || !photographer || typeof window === 'undefined') {
      return '#';
    }

    const host = window.location.host;
    const protocol = window.location.protocol.replace(':', '');
    const username = photographer.username.toLowerCase();

    // 2. Extraímos o domínio base (removendo subdomínio atual se necessário)
    let mainDomain = host;
    if (host.startsWith(`${username}.`)) {
      mainDomain = host.replace(`${username}.`, '');
    }

    // 3. Delegamos a construção para a função centralizada
    return resolveGalleryUrl(
      username,
      galeria.slug,
      photographer.use_subdomain,
      mainDomain,
      protocol,
    );
  }, [mounted, galeria, photographer]);

  // 2. Usamos uma tag <a> para comportamento nativo de link
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col bg-petroleum/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:border-[#F3E5AB]/40 hover:translate-y-[-4px] cursor-pointer shadow-2xl no-underline"
    >
      {/* Container da Imagem */}
      <div className="relative aspect-[1] overflow-hidden border-b border-white/5">
        <img
          ref={imgRef}
          src={imageUrl}
          alt={galeria.title}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-petroleum via-transparent to-transparent opacity-80" />

        <div className="absolute top-3 left-3 flex gap-2">
          {!galeria.is_public && (
            <div className="bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-lg">
              <Lock size={14} className="text-[#F3E5AB]" />
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 backdrop-blur-md rounded-lg text-[9px] font-bold tracking-[0.2em] text-[#F3E5AB] border border-white/10 uppercase shadow-sm">
            <Tag size={10} strokeWidth={2.5} />
            {galeria.category || 'Ensaio'}
          </span>
        </div>
      </div>

      {/* Conteúdo Informativo */}
      <div className="p-5 space-y-4">
        <h3 className="text-white text-lg font-semibold tracking-tight group-hover:text-[#F3E5AB] transition-colors leading-tight line-clamp-2 min-h-[1rem]">
          {galeria.title}
        </h3>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex flex-col gap-2">
            {/* Localização */}
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin size={11} className="text-gray-400" />
              <span className="text-[9px] uppercase font-medium tracking-widest truncate max-w-[120px]">
                {galeria.location || 'Brasil'}
              </span>
            </div>

            {/* Data */}
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={11} className="text-gray-400" />
              <span className="text-[9px] uppercase font-medium tracking-widest">
                {formatDateLong(galeria.date)}
              </span>
            </div>

            {/* 🎯 QUANTIDADE DE FOTOS 
            <div className="flex items-center gap-2 text-white/50">
              <ImageIcon size={12} className="text-[#F3E5AB]/70" />
              <span className="text-[10px] uppercase font-medium tracking-widest">
                {galeria. || 0} fotos
              </span>
            </div>*/}
          </div>

          {/* Botão de Ação */}
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#F3E5AB] group-hover:border-[#F3E5AB] transition-all duration-300 self-end">
            <ArrowRight
              size={16}
              className="text-white/70 group-hover:text-black transition-colors"
            />
          </div>
        </div>
      </div>
    </a>
  );
}
