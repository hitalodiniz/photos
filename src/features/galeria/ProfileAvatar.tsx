'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Galeria } from '@/core/types/galeria';
import Image from 'next/image';
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
  const [mounted, setMounted] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Auto-colapsa após 4s no mobile
  const handleMobileTap = () => {
    if (!isMobile) return;
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setMobileExpanded(true);
    collapseTimer.current = setTimeout(() => setMobileExpanded(false), 4000);
  };

  const { fullName, displayAvatar, initialLetter } = useMemo(() => {
    const name = photographer?.full_name || 'Autor';
    return {
      fullName: name,
      displayAvatar: photographer?.profile_picture_url || null,
      initialLetter: name.charAt(0).toUpperCase(),
    };
  }, [photographer]);

  if (!isVisible && position === 'top-page') return null;
  if (!mounted) return null;

  const profileUrl = getCreatorProfileUrl(photographer);

  // Decide se mostra conteúdo expandido: desktop sempre, mobile só após tap
  const showContent = !isMobile || mobileExpanded;

  const waHref = (() => {
    const phone = photographer?.phone_contact?.replace(/\D/g, '') || '';
    const siteUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_MAIN_DOMAIN ||
      'nossa galeria';
    const galleryTitle = galeria?.title || 'sua galeria';
    const msg = `Olá! Vi seu trabalho na galeria "${galleryTitle}" através do ${siteUrl} e gostaria de saber mais sobre seus serviços. Poderia me passar mais informações?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  })();

  // ── top-page ──
  if (position === 'top-page') {
    return (
      <div
        className="z-20"
        style={{
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <div
          className="flex items-center rounded-lg shadow-lg transition-all duration-300"
          style={{
            background: 'rgba(0,0,0,0.52)',
            backdropFilter: 'blur(10px)',
            padding: showContent ? '5px 12px 5px 5px' : '4px',
            gap: showContent ? 10 : 0,
          }}
        >
          {/* Avatar — só círculo no mobile, clicável para expandir */}
          <div
            className="relative flex-shrink-0 rounded-full overflow-hidden"
            style={{
              width: 36,
              height: 36,
              cursor: isMobile ? 'pointer' : 'default',
            }}
            onClick={handleMobileTap}
          >
            {displayAvatar ? (
              <Image
                src={displayAvatar}
                alt={fullName}
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <span className="text-[11px] font-semibold text-white">
                  {initialLetter}
                </span>
              </div>
            )}
          </div>

          {/* Conteúdo — oculto no mobile até tap */}
          <div
            className="flex items-center overflow-hidden transition-all duration-300 py-2"
            style={{
              maxWidth: showContent ? 300 : 0,
              opacity: showContent ? 1 : 0,
              gap: showContent ? 10 : 0,
              pointerEvents: showContent ? 'auto' : 'none',
            }}
          >
            {/* Label + nome clicáveis → perfil */}
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col whitespace-nowrap"
              style={{ gap: 1, textDecoration: 'none' }}
            >
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{
                  lineHeight: 1,
                  color: `rgb(var(--pub-hero-accent, 243 229 171))`,
                }}
              >
                Registrado por
              </span>
              <span
                className="text-[11px] font-semibold text-white leading-tight truncate uppercase mt-0.5"
                style={{ maxWidth: 150, letterSpacing: '-0.01em' }}
              >
                {fullName}
              </span>
            </a>

            {/* Separador + ícones de contato */}
            {hasSocial && (
              <>
                <div
                  className="self-stretch flex-shrink-0"
                  style={{
                    width: 1,
                    background: 'rgba(255,255,255,0.12)',
                    margin: '2px 0',
                  }}
                />
                <div className="flex items-center gap-2">
                  {photographer?.phone_contact &&
                    photographer?.show_phone_on_public_profile !== true && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center transition-colors duration-150"
                        style={{
                          width: 20,
                          height: 20,
                          color: 'rgba(255,255,255,0.9)',
                          lineHeight: 0,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = '#25D366')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color =
                            'rgba(255,255,255,0.9)')
                        }
                      >
                        <WhatsAppIcon className="w-[16px] h-[16px]" />
                      </a>
                    )}

                  {photographer?.instagram_link && (
                    <a
                      href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center transition-colors duration-150"
                      style={{
                        width: 20,
                        height: 20,
                        color: 'rgba(255,255,255,0.9)',
                        lineHeight: 0,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = '#f472b6')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')
                      }
                    >
                      <InstagramIcon className="w-[16px] h-[16px]" />
                    </a>
                  )}

                  {hasWebsite && photographer?.website && (
                    <a
                      href={
                        photographer.website.startsWith('http')
                          ? photographer.website
                          : `https://${photographer.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center transition-colors duration-150"
                      style={{
                        width: 20,
                        height: 20,
                        color: 'rgba(255,255,255,0.55)',
                        lineHeight: 0,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = '#60a5fa')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')
                      }
                    >
                      <Globe size={13} strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── bottom-lightbox ──
  return (
    <div className="flex items-center cursor-pointer select-none z-20 scale-95">
      <div className="flex items-center p-2 pr-5 gap-3 rounded-luxury bg-white/90 dark:bg-black/80 backdrop-blur-md shadow-sm">
        <div className="relative flex-shrink-0 w-11 h-11 rounded-full overflow-hidden shadow-md">
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
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] uppercase tracking-tighter font-medium opacity-70 text-slate-700 dark:text-slate-400">
            Registrado por
          </span>
          <span className="text-[13px] font-semibold truncate text-slate-900 dark:text-white">
            {fullName}
          </span>
          <div className="flex items-center gap-3 mt-2">
            {hasSocial &&
              photographer?.phone_contact &&
              photographer?.show_phone_on_public_profile !== true && (
                <a
                  href={waHref}
                  target="_blank"
                  className="text-slate-500 dark:text-white/60 hover:text-green-500 transition-colors"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                </a>
              )}
            {hasSocial && photographer?.instagram_link && (
              <a
                href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                target="_blank"
                className="text-slate-500 dark:text-white/60 hover:text-pink-500 transition-colors"
              >
                <InstagramIcon className="w-3.5 h-3.5" />
              </a>
            )}
            <a
              href={profileUrl}
              target="_blank"
              className="text-slate-500 dark:text-white/60 hover:text-amber-500 transition-colors"
            >
              <User size={16} />
            </a>
            {hasWebsite && photographer?.website && (
              <a
                href={
                  photographer.website.startsWith('http')
                    ? photographer.website
                    : `https://${photographer.website}`
                }
                target="_blank"
                className="text-slate-500 dark:text-white/60 hover:text-blue-500 transition-colors"
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
