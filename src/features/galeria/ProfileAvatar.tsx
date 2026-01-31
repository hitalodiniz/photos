'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import Image from 'next/image';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { getCreatorProfileUrl } from '@/core/utils/url-helper';
import { Globe, User, MessageCircle } from 'lucide-react';
import { usePlan } from '@/hooks/usePlan';

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
  const { planKey } = usePlan();

  const photographer = galeria.photographer;
  const profileLink = getCreatorProfileUrl(photographer);

  // 🛡️ Definição de Permissões Progressivas
  // FREE: Avatar + Nome + Perfil Interno
  // START: + WhatsApp
  // PLUS: + Instagram
  // PRO: (Mantém anteriores)
  // PREMIUM: + Website Direto
  const hasWhatsApp = ['START', 'PLUS', 'PRO', 'PREMIUM'].includes(planKey);
  const hasInstagram = ['PLUS', 'PRO', 'PREMIUM'].includes(planKey);
  const hasWebsite = planKey === 'PREMIUM';

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => setIsExpanded(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  const whatsappLink = `https://wa.me/${photographer.phone_contact?.replace(/\D/g, '')}?text=${encodeURIComponent(
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
      : 'relative scale-90 md:scale-100 z-[20]';

  const getBtnClass = (activeColor: string) => `
    p-1.5 rounded-full transition-all border flex items-center justify-center
    ${activeColor}
    ${
      position === 'bottom-lightbox'
        ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20'
        : 'bg-white/10 text-white border-white/10'
    }
  `;

  return (
    <div
      className={`${positionClasses} flex items-center cursor-pointer select-none`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div
        className={`
        flex items-center rounded-luxury md:p-2 border shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${isExpanded ? 'gap-2 p-1.5' : 'gap-0 p-0 px-1'} 
        ${
          position === 'bottom-lightbox'
            ? 'bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-3xl border-black/20 dark:border-white/20'
            : 'bg-black/45 backdrop-blur-xl border-white/10'
        }
      `}
      >
        {/* Avatar Container */}
        <div className="relative group flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden flex items-center justify-center shadow-inner">
          <div className="absolute -inset-1 bg-gradient-to-tr from-gold/40 to-[#F3E5AB]/40 rounded-full blur-sm opacity-30 group-hover:opacity-60 transition duration-700"></div>

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

        {/* Expandable Content */}
        <div
          className={`
          flex flex-col items-start gap-1.5 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden
          ${isExpanded ? 'max-w-[280px] opacity-100 ml-1' : 'max-w-0 opacity-0'}
        `}
        >
          <div className="flex flex-col items-start whitespace-nowrap">
            <p
              className={`text-[8px] md:text-[9px] tracking-widest uppercase font-bold leading-none mb-1 transition-colors ${
                position === 'bottom-lightbox'
                  ? 'text-slate-500 dark:text-[#F3E5AB]/80'
                  : 'text-[#F3E5AB]'
              }`}
            >
              Registrado por
            </p>
            <span
              className={`text-[10px] md:text-[11px] font-bold tracking-tight leading-tight ${
                position === 'bottom-lightbox'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-white'
              }`}
            >
              {fullName}
            </span>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {/* WHATSAPP (START+) */}
            {hasWhatsApp && photographer?.phone_contact && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={getBtnClass('hover:bg-[#25D366] hover:text-white')}
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle size={12} fill="currentColor" />
              </a>
            )}

            {/* INSTAGRAM (PLUS+) */}
            {hasInstagram && photographer?.instagram_link && (
              <a
                href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={getBtnClass(
                  'hover:bg-gradient-to-tr hover:from-[#f09433] hover:to-[#bc1888] hover:text-white',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <InstagramIcon size={12} />
              </a>
            )}

            {/* PERFIL INTERNO (FREE+) */}
            <a
              href={profileLink}
              target="_blank"
              rel="noopener noreferrer"
              className={getBtnClass('hover:bg-gold hover:text-petroleum')}
              onClick={(e) => e.stopPropagation()}
            >
              <User size={12} strokeWidth={3} />
            </a>

            {/* WEBSITE (PREMIUM) */}
            {hasWebsite && photographer?.website && (
              <a
                href={
                  photographer.website.startsWith('http')
                    ? photographer.website
                    : `https://${photographer.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className={getBtnClass('hover:bg-blue-600 hover:text-white')}
                onClick={(e) => e.stopPropagation()}
              >
                <Globe size={12} strokeWidth={3} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
