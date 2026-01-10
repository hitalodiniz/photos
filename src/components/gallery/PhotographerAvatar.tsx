'use client';
import React, { useMemo } from 'react';
import type { Galeria } from '@/core/types/galeria';
import Image from 'next/image';
import { GALLERY_MESSAGES } from '@/constants/messages';

interface PhotographerAvatarProps {
  galeria: Galeria;
  position: 'top-page' | 'bottom-lightbox';
  isVisible?: boolean;
}

export default function PhotographerAvatar({
  galeria,
  position,
  isVisible = true,
}: PhotographerAvatarProps) {
  const whatsappLink = `https://wa.me/${galeria.photographer.phone_contact.replace(/\D/g, '')}?text=${encodeURIComponent(
    GALLERY_MESSAGES.CONTACT_PHOTOGRAPHER_DIRETO(),
  )}`;

  if (!isVisible && position === 'top-page') return null;

  // Atalho para facilitar o acesso aos dados do fotógrafo
  const photographer = galeria.photographer;

  const { fullName, displayAvatar, initialLetter } = useMemo(() => {
    const name = photographer?.full_name || 'Fotógrafo';
    return {
      fullName: name,
      displayAvatar: photographer?.profile_picture_url || null,
      initialLetter: name.charAt(0).toUpperCase(),
    };
  }, [photographer]);

  const positionClasses =
    position === 'top-page'
      ? 'relative z-10 animate-in fade-in scale-90 md:scale-100 slide-in-from-right-10 duration-700'
      : 'md:fixed md:bottom-10 md:right-8 scale-90 md:scale-100 z-[999999]';

  return (
    <div
      className={`${positionClasses} flex items-center gap-3 animate-in fade-in duration-500`}
    >
      <div
        className={`
        flex items-center gap-4 p-3 pr-5 rounded-[1.2rem] border shadow-2xl
        ${
          position === 'bottom-lightbox'
            ? 'bg-[#1A1A1A]/90 backdrop-blur-3xl border-white/20 shadow-black/50'
            : 'bg-black/45 backdrop-blur-xl border-white/10'
        }
      `}
      >
        {/* Foto do Fotógrafo */}
        {/* Foto ou Inicial do Fotógrafo */}
        <div className="relative group flex-shrink-0 cursor-pointer w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex items-center justify-center">
          <div className="absolute -inset-1 bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] rounded-full blur-sm opacity-30 group-hover:opacity-60 transition duration-700"></div>

          {displayAvatar ? (
            <Image
              src={displayAvatar}
              alt={fullName}
              fill
              sizes="(max-width: 768px) 48px, 64px"
              className="object-cover transition-transform duration-500 group-hover:scale-105 z-10 rounded-full"
              loading="lazy"
            />
          ) : (
            // 🎯 Fallback Premium quando não há foto
            <div className="z-10 w-full h-full bg-slate-800 flex items-center justify-center border border-white/10 rounded-full transition-transform duration-500 group-hover:scale-105">
              <span className="text-white font-bold text-xl md:text-2xl font-barlow tracking-tighter">
                {initialLetter}
              </span>
            </div>
          )}
        </div>

        {/* Texto e Botões */}
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-col items-start">
            <p className="text-[8px] md:text-[10px] italic tracking-[0.1em] text-[#F3E5AB] font-medium opacity-80 leading-none mb-1">
              Fotografado por
            </p>
            <span className="text-sm md:text-base font-serif italic text-white leading-tight">
              {photographer?.full_name || 'Fotógrafo'}
            </span>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {/* 🎯 FIX: Verificação correta do WhatsApp */}
            {photographer?.phone_contact && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-white/10 text-white rounded-full hover:bg-[#25D366] transition-all border border-white/10 hover:scale-110 active:scale-95"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  width="14"
                  height="14"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            )}

            {/* 🎯 FIX: Verificação correta do Instagram */}
            {photographer?.instagram_link && (
              <a
                href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-white/10 text-white rounded-full hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] transition-all border border-white/10 hover:scale-110"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  width="14"
                  height="14"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}

            <a
              href={`/${photographer?.username}`}
              className="p-1.5 bg-white/10 text-white rounded-full hover:bg-[#D4AF37] transition-all border border-white/10 hover:scale-110"
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
