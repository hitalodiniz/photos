'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Images,
  Globe,
  Lock,
  MoreVertical,
  MapPin,
  Camera,
} from 'lucide-react';
import type { Galeria } from '@/core/types/galeria';
import { resolveGalleryUrl, RESOLUTIONS } from '@/core/utils/url-helper';
import { useGoogleDriveImage } from '@/hooks/useGoogleDriveImage';
import { formatDateLong } from '@/core/utils/data-helpers';
import { w } from 'node_modules/vitest/dist/chunks/reporters.d.Rsi0PyxX';

export function PublicGaleriaCard({
  galeria,
  isFeatured = false,
}: {
  galeria: Galeria;
  isFeatured?: boolean;
}) {
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

  const photographer = galeria.photographer;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔗 MANTENDO O LINK ORIGINAL (Lógica de subdomínios/domínios base)
  const href = useMemo(() => {
    if (!mounted || !photographer || typeof window === 'undefined') {
      return '#';
    }

    const host = window.location.host;
    const protocol = window.location.protocol.replace(':', '');
    const username = photographer.username.toLowerCase();

    let mainDomain = host;
    if (host.startsWith(`${username}.`)) {
      mainDomain = host.replace(`${username}.`, '');
    }

    return resolveGalleryUrl(
      username,
      galeria.slug,
      photographer.use_subdomain,
      mainDomain,
      protocol,
    );
  }, [mounted, galeria, photographer]);

  return (
    <div className="relative group overflow-hidden rounded-lg shadow-2xl bg-zinc-900 aspect-[3/2]">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full no-underline"
      >
        {/* Imagem com Zoom suave no hover */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt={galeria.title}
          onLoad={handleLoad}
          onError={handleError}
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100"
        />

        {/* Gradiente de proteção mais denso para fontes maiores */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/40 to-transparent z-[1]" />

        <div className="absolute inset-0 p-5 flex flex-col justify-between z-[2]">
          {/* Topo: Badges Maiores */}
          <div className="flex justify-between items-start">
            <span
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-luxury-normal backdrop-blur-md border border-white/10 shadow-xl ${
                galeria.is_public
                  ? 'bg-emerald-600/90 text-white'
                  : 'bg-amber-600/90 text-white'
              }`}
            >
              {galeria.is_public ? <Globe size={14} /> : <Lock size={14} />}
              {galeria.is_public ? 'Público' : 'Privado'}
            </span>

            <button className="text-white/70 hover:text-gold transition-colors p-1">
              <MoreVertical size={24} />
            </button>
          </div>

          {/* Base: Tipografia Aumentada */}
          <div className="space-y-3">
            <h3 className="text-white text-2xl md:text-3xl font-bold leading-tight group-hover:text-gold transition-colors drop-shadow-2xl  italic flex items-center gap-3">
              <Camera
                className={`text-[#F3E5AB] shrink-0 transition-all duration-1000 drop-shadow-md 
                w-6 h-6 md:w-8 md:h-8
              }`}
                strokeWidth={1.5}
              />
              {galeria.title}
            </h3>

            {/* Linha Decorativa Hero */}
            <div className="h-[2px] bg-gold/80 w-20 group-hover:w-full transition-all duration-700 rounded-full shadow-[0_0_10px_rgba(243,229,171,0.5)]" />

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-4 text-white text-[13px] font-semibold tracking-wide  drop-shadow-md">
                  {/* LOCALIZAÇÃO: Só exibe se houver valor */}
                  {galeria.location && (
                    <span className="flex items-center gap-2">
                      <MapPin
                        size={15}
                        className="text-gold"
                        strokeWidth={2.5}
                      />
                      {galeria.location}
                    </span>
                  )}

                  {/* Divisor condicional se houver localização */}
                  {galeria.location && (
                    <span className="text-white/30 text-lg">|</span>
                  )}

                  {/* Data formatada maior */}
                  <span className="flex items-center gap-2">
                    <Calendar
                      size={15}
                      className="text-gold"
                      strokeWidth={2.5}
                    />
                    {formatDateLong(galeria.date)}
                  </span>
                </div>

                {/* Badge de Fotos Profissional */}
                <div className="hidden sm:flex items-center gap-2 text-gold text-[11px] font-semibold tracking-luxury-widest opacity-90 group-hover:opacity-100 transition-opacity">
                  <Images size={16} strokeWidth={3} />
                  <span>VER GALERIA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}
