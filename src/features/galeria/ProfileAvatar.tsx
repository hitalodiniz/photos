'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { Galeria } from '@/core/types/galeria';
import Image from 'next/image';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import InstagramIcon from '@/components/ui/InstagramIcon';
import { getCreatorProfileUrl } from '@/core/utils/url-helper';
import { Globe, User } from 'lucide-react';
import { usePlan } from '@/core/context/PlanContext';
import { getGalleryPermission } from '@/core/utils/plan-helpers';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export default function PhotographerAvatar({
  galeria,
  position,
  isVisible = true,
}: {
  galeria: Galeria;
  position: 'top-page' | 'bottom-lightbox';
  isVisible?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { permissions } = usePlan();
  const photographer = galeria.photographer;

  const displayLevel = useMemo(
    () =>
      getGalleryPermission(galeria, 'socialDisplayLevel') ||
      permissions.socialDisplayLevel,
    [galeria, permissions.socialDisplayLevel],
  );

  const hasSocial = displayLevel === 'social' || displayLevel === 'full';
  const hasWebsite = displayLevel === 'full';

  useEffect(() => {
    if (window.innerWidth >= 768) setIsExpanded(true);
  }, []);

  const { fullName, displayAvatar, initialLetter } = useMemo(() => {
    const name = photographer?.full_name || 'Autor';
    return {
      fullName: name,
      displayAvatar: photographer?.profile_picture_url || null,
      initialLetter: name.charAt(0).toUpperCase(),
    };
  }, [photographer]);

  if (!isVisible && position === 'top-page') return null;

  const getBtnClass = (hover: string) => `
    transition-all duration-200 hover:scale-110
    ${position === 'bottom-lightbox' ? 'text-slate-600 dark:text-white/60' : 'text-white/70'}
    ${hover}
  `;

  return (
    <div
      className={`flex items-center cursor-pointer select-none transition-all duration-300 ${
        position === 'top-page' ? 'z-20' : 'z-20 scale-95'
      }`}
      onClick={() => window.innerWidth < 768 && setIsExpanded(!isExpanded)}
    >
      <div
        className={`
          flex items-center p-2 rounded-luxury transition-all duration-500 border
          ${isExpanded ? 'pr-5 gap-3' : 'gap-0'}
          ${
            position === 'bottom-lightbox'
              ? 'bg-white/90 dark:bg-black/80 backdrop-blur-md border-slate-200 dark:border-white/10 shadow-sm'
              : 'bg-black/40 backdrop-blur-md border-white/20'
          }
        `}
      >
        {/* Avatar - Ocupa a altura possível */}
        <div className="relative flex-shrink-0 w-11 h-11 rounded-full overflow-hidden border border-white/10 shadow-md">
          {displayAvatar ? (
            <Image
              src={displayAvatar}
              alt={fullName}
              fill
              sizes="44px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {initialLetter}
              </span>
            </div>
          )}
        </div>

        {/* Content Box - Nome em cima, Ícones embaixo */}
        <div
          className={`flex flex-col justify-center overflow-hidden transition-all duration-500 ${
            isExpanded
              ? 'max-w-[200px] opacity-100'
              : 'max-w-0 opacity-0 invisible'
          }`}
        >
          <div className="flex flex-col leading-tight">
            <span
              className={`text-[9px] uppercase tracking-tighter font-medium opacity-70 ${
                position === 'bottom-lightbox'
                  ? 'text-slate-700 dark:text-slate-400'
                  : 'text-white'
              }`}
            >
              Registrado por
            </span>
            <span
              className={`text-[13px] font-semibold truncate ${
                position === 'bottom-lightbox'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-white'
              }`}
            >
              {fullName}
            </span>
          </div>

          {/* Ícones abaixo do nome */}
          <div className="flex items-center gap-3 mt-2 justify-center">
            {hasSocial && photographer?.phone_contact && (
              <a
                href={`https://wa.me/${photographer.phone_contact.replace(/\D/g, '')}`}
                target="_blank"
                className={getBtnClass('hover:text-green-500')}
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
              </a>
            )}

            {hasSocial && photographer?.instagram_link && (
              <a
                href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                target="_blank"
                className={getBtnClass('hover:text-pink-500')}
              >
                <InstagramIcon className="w-3.5 h-3.5" />
              </a>
            )}

            <a
              href={getCreatorProfileUrl(photographer)}
              target="_blank"
              className={getBtnClass('hover:text-amber-500')}
            >
              <User size={14} />
            </a>

            {hasWebsite && photographer?.website && (
              <a
                href={
                  photographer.website.startsWith('http')
                    ? photographer.website
                    : `https://${photographer.website}`
                }
                target="_blank"
                className={getBtnClass('hover:text-blue-500')}
              >
                <Globe size={13} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
