'use client';
import React, { useMemo, useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import Image from 'next/image';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { getCreatorProfileUrl } from '@/core/utils/url-helper';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const profileLink = getCreatorProfileUrl(galeria.photographer);

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => setIsExpanded(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  const photographer = galeria.photographer;
  const whatsappLink = `https://wa.me/${photographer.phone_contact.replace(/\D/g, '')}?text=${encodeURIComponent(
    GALLERY_MESSAGES.CONTACT_PHOTOGRAPHER_DIRETO(),
  )}`;

  const { fullName, displayAvatar, initialLetter } = useMemo(() => {
    const name = photographer?.full_name || 'Autor';
    return {
      fullName: name,
      displayAvatar: photographer?.profile_picture_url || null,
      initialLetter: name.charAt(0).toUpperCase(),
    };
  }, [photographer]);

  if (!isVisible && position === 'top-page') return null;

  const positionClasses =
    position === 'top-page'
      ? 'relative z-10 animate-in fade-in scale-90 md:scale-100 slide-in-from-right-10 duration-700 z-[20]'
      : 'relative scale-90 md:scale-100 z-[20]'; // Removido fixed e right-8 para permitir alinhamento no footer

  return (
    <div
      className={`${positionClasses} flex items-center cursor-pointer`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div
        className={`
        flex items-center rounded-luxury md:p-2 border shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${isExpanded ? 'gap-2 p-1.5 ' : 'gap-0 p-0 px-1'} 
        ${
          position === 'bottom-lightbox'
            ? 'bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-3xl border-black/20 dark:border-white/20 shadow-black/50 transition-colors duration-300'
            : 'bg-black/45 backdrop-blur-xl border-white/10'
        }
      `}
      >
        {/* Foto/Avatar */}
        <div className="relative group flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden flex items-center justify-center">
          <div className="absolute -inset-1 bg-gradient-to-tr from-champagneto-[#F3E5AB] rounded-full blur-sm opacity-30 group-hover:opacity-60 transition duration-700"></div>

          {displayAvatar ? (
            <Image
              src={displayAvatar}
              alt={fullName}
              fill
              sizes="(max-width: 768px) 40px, 56px"
              className="object-cover transition-transform duration-500 group-hover:scale-105 z-10 rounded-full"
            />
          ) : (
            <div className="z-10 w-full h-full bg-slate-800 flex items-center justify-center border border-white/10 rounded-full">
              <span className="text-white font-semibold text-lg md:text-xl font-barlow tracking-tighter">
                {initialLetter}
              </span>
            </div>
          )}
        </div>

        {/* Conteúdo Expansível */}
        <div
          className={`
          flex flex-col items-start gap-1.5 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
          ${isExpanded ? 'max-w-[200px] opacity-100 ml-1' : 'max-w-0 md:max-w-[300px] opacity-0 md:opacity-100 md:ml-2'}
        `}
        >
          <div className="flex flex-col items-start whitespace-nowrap">
            <p className={`text-[8px] md:text-[9px] tracking-wider font-medium leading-none mb-0.5 transition-colors duration-300 ${
              position === 'bottom-lightbox' 
                ? 'text-slate-600 dark:text-[#F3E5AB]/80' 
                : 'text-[#F3E5AB]'
            }`}>
              Registrado por
            </p>
            <span className={`text-[9px] md:text-[10px] leading-tight transition-colors duration-300 ${
              position === 'bottom-lightbox' 
                ? 'text-slate-900 dark:text-white' 
                : 'text-white'
            }`}>
              {fullName}
            </span>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {photographer?.phone_contact && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 rounded-full hover:bg-[#25D366] transition-all border ${
                  position === 'bottom-lightbox'
                    ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20'
                    : 'bg-white/10 text-white border-white/10'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  width="12"
                  height="12"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            )}

            {photographer?.instagram_link && (
              <a
                href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 rounded-full hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] transition-all border ${
                  position === 'bottom-lightbox'
                    ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20'
                    : 'bg-white/10 text-white border-white/10'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <InstagramIcon size={12} className={position === 'bottom-lightbox' ? 'text-black dark:text-white' : 'text-white'} />
              </a>
            )}

            <a
              href={profileLink}
              className={`p-1.5 rounded-full hover:bg-champagnetransition-all border ${
                position === 'bottom-lightbox'
                  ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20'
                  : 'bg-white/10 text-white border-white/10'
              }`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                width="12"
                height="12"
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
