'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Lock, ArrowRight, Tag } from 'lucide-react';
import type { Galeria } from '@/core/types/galeria';
import { getProxyUrl, resolveGalleryUrl } from '@/core/utils/url-helper';

export function PublicGaleriaCard({ galeria }: { galeria: Galeria }) {
  const [isClient, setIsClient] = useState(false);
  const imageUrl = getProxyUrl(galeria.cover_image_url, '600');
  const photographer = galeria.photographer;

  // Garante que o componente só tente gerar a URL após montar no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 1. Geramos a URL correta de forma estável usando useMemo
  const finalUrl = useMemo(() => {
    if (!isClient || typeof window === 'undefined' || !photographer) return '#';

    const host = window.location.host; // ex: "hitalodiniz.localhost:3000"
    const username = photographer.username.toLowerCase();
    const isSubdomainActive = photographer.use_subdomain === true;

    // 🎯 Lógica robusta para extrair o Main Domain
    let mainDomain = host;

    if (isSubdomainActive && host.includes(`${username}.`)) {
      // Remove o subdomínio e o ponto seguinte, preservando o resto (inclusive porta)
      mainDomain = host.split(`${username}.`)[1] || host;
    }

    const protocol = window.location.protocol.replace(':', '');

    return resolveGalleryUrl(
      username,
      galeria.slug,
      isSubdomainActive,
      mainDomain,
      protocol,
    );
  }, [isClient, galeria, photographer]);
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
    });
  };

  // 2. Usamos uma tag <a> para comportamento nativo de link
  return (
    <a
      href={finalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col bg-[#1E293B]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:border-[#F3E5AB]/40 hover:translate-y-[-4px] cursor-pointer shadow-2xl no-underline"
    >
      {/* Container da Imagem */}
      <div className="relative aspect-[4/5] overflow-hidden border-b border-white/5">
        <img
          src={imageUrl}
          alt={galeria.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent opacity-80" />

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
        <h3 className="text-white text-lg font-semibold tracking-tight group-hover:text-[#F3E5AB] transition-colors leading-tight line-clamp-2 min-h-[3rem]">
          {galeria.title}
        </h3>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white/50">
              <MapPin size={12} className="text-[#F3E5AB]/70" />
              <span className="text-[10px] uppercase font-medium tracking-widest truncate max-w-[120px]">
                {galeria.location || 'Brasil'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-white/50">
              <Calendar size={12} className="text-[#F3E5AB]/70" />
              <span className="text-[10px] uppercase font-medium tracking-widest">
                {formatDate(galeria.date)}
              </span>
            </div>
          </div>

          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#F3E5AB] group-hover:border-[#F3E5AB] transition-all duration-300">
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
