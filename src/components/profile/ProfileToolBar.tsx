'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Instagram,
  Globe,
  MapPin,
  Link as LinkIcon,
  Check,
  ChevronDown,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { usePlan } from '@/core/context/PlanContext';
import { PlanGuard } from '@/components/auth/PlanGuard';
import { useAuth } from '@photos/core-auth';

interface ProfileToolBarProps {
  phone?: string;
  instagram?: string;
  website?: string;
  cities?: string[];
  username?: string;
  useSubdomain?: boolean;
}

export const ProfileToolBar = ({
  phone,
  instagram,
  website,
  cities = [],
  username,
  useSubdomain = true,
}: ProfileToolBarProps) => {
  const { permissions } = usePlan();
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shouldHideToDrawer, setShouldHideToDrawer] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isOwnerViewing = !!user;

  const profileUrl = useMemo(() => {
    if (!username)
      return typeof window !== 'undefined' ? window.location.href : '';
    const isProd = process.env.NODE_ENV === 'production';
    const protocol = isProd ? 'https:' : 'http:';
    const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000';

    if (useSubdomain) return `${protocol}//${username}.${mainDomain}`;
    return `${protocol}//${mainDomain}/${username}`;
  }, [username, useSubdomain]);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && contentRef.current) {
        const overflowed =
          contentRef.current.scrollWidth > containerRef.current.clientWidth;
        setShouldHideToDrawer(
          overflowed || (window.innerWidth < 768 && cities.length > 1),
        );
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [cities]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="z-[110] sticky top-0 w-full pointer-events-auto font-sans">
      <div className="mx-auto bg-petroleum w-full border-b border-white/10 shadow-2xl relative">
        <div className="flex flex-row items-center w-full max-w-[1600px] px-3 md:px-6 h-14 mx-auto gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            {(isOwnerViewing || permissions.profileLevel !== 'basic') && (
              <PlanGuard
                feature="profileLevel"
                variant="mini"
                infoExtra="Este recurso é exclusivo para planos superiores e está oculto para o público."
              >
                <div className="flex items-center gap-1.5 md:gap-3 animate-in fade-in duration-500">
                  <MapPin size={16} className="text-champagne shrink-0" />
                  <div
                    ref={containerRef}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    {permissions.profileLevel === 'basic' && (
                      <div ref={contentRef} className="flex items-center gap-2">
                        <span className="text-[11px] font-medium tracking-luxury-tight text-white/60">
                          Cidades de atuação serão exibidas aqui.
                        </span>
                      </div>
                    )}

                    {permissions.profileLevel !== 'basic' &&
                      (!shouldHideToDrawer ? (
                        <div
                          ref={contentRef}
                          className="flex items-center gap-2"
                        >
                          {cities.map((city) => (
                            <a
                              key={city}
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1.5 rounded-luxury text-[12px] font-semibold text-white/90 bg-white/5 border border-white/10 h-9 flex items-center shrink-0 italic hover:bg-white/10 transition-all"
                            >
                              {city}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                          className="flex items-center justify-between px-4 py-1.5 w-[155px] h-8 rounded-luxury bg-white/5 border border-white/10 text-white/80 hover:text-white transition-all shrink-0"
                        >
                          <span className="text-[11px] font-medium tracking-luxury-tight">
                            {isDrawerOpen ? 'Fechar' : 'Atuação'}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`text-champagne transition-transform duration-500 ${isDrawerOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      ))}
                  </div>
                </div>
              </PlanGuard>
            )}
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {/* INSTAGRAM */}
            {(isOwnerViewing ||
              (instagram &&
                ['social', 'full'].includes(
                  permissions.socialDisplayLevel,
                ))) && (
              <PlanGuard
                feature="socialDisplayLevel"
                variant="mini"
                infoExtra="Este recurso é exclusivo para planos superiores e está oculto para o público."
              >
                <a
                  href={`https://instagram.com/${instagram?.replace('@', '')}`}
                  target="_blank"
                  className="flex items-center justify-center rounded-lg h-9 w-9 md:h-10 md:w-auto md:px-4 border border-white/10 bg-slate-800 text-white hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] transition-all"
                >
                  <Instagram size={16} />
                  <span className="text-[11px] font-semibold uppercase hidden md:block ml-2">
                    Instagram
                  </span>
                </a>
              </PlanGuard>
            )}

            {/* WEBSITE */}
            {(isOwnerViewing ||
              (website && permissions.socialDisplayLevel === 'full')) && (
              <PlanGuard
                feature="socialDisplayLevel"
                variant="mini"
                infoExtra="Este recurso é exclusivo para planos superiores e está oculto para o público."
              >
                <a
                  href={
                    website?.startsWith('http') ? website : `https://${website}`
                  }
                  target="_blank"
                  className="flex items-center justify-center rounded-lg h-9 w-9 md:h-10 md:w-auto md:px-4 border border-white/10 bg-slate-800 text-white hover:bg-white hover:text-black transition-all"
                >
                  <Globe size={16} />
                  <span className="text-[11px] font-semibold uppercase hidden md:block ml-2">
                    Website
                  </span>
                </a>
              </PlanGuard>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center rounded-lg h-9 w-9 md:h-10 md:w-auto md:px-4 border border-white/10 bg-slate-800 text-white hover:bg-slate-700 transition-all"
            >
              {copied ? (
                <Check size={16} className="text-[#25D366]" />
              ) : (
                <LinkIcon size={16} />
              )}
              <span className="text-[11px] font-semibold uppercase hidden md:block ml-2">
                Perfil
              </span>
            </button>

            {/* WHATSAPP */}
            {(isOwnerViewing ||
              (phone && permissions.socialDisplayLevel !== 'minimal')) && (
              <PlanGuard
                feature="socialDisplayLevel"
                variant="mini"
                infoExtra="Este recurso é exclusivo para planos superiores e está oculto para o público."
              >
                <a
                  href={`https://wa.me/${phone?.replace(/\D/g, '')}`}
                  target="_blank"
                  className="flex items-center justify-center rounded-lg h-9 w-9 md:h-10 md:w-auto md:px-5 border border-white/10 bg-slate-800 text-white hover:bg-green-500 hover:shadow-lg transition-all group"
                >
                  <WhatsAppIcon className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                  <span className="text-[11px] font-semibold uppercase hidden md:block ml-2">
                    WhatsApp
                  </span>
                </a>
              </PlanGuard>
            )}
          </div>
        </div>

        {/* GAVETA CIDADES */}
        <div
          className={`overflow-hidden transition-all duration-500 w-full border-t border-white/10 bg-petroleum ${isDrawerOpen && shouldHideToDrawer ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2 py-2 px-2">
            {cities.map((city) => (
              <a
                key={city}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-luxury text-[12px] font-semibold text-white/90 bg-white/5 border border-white/10 h-9 flex items-center italic hover:bg-white/10 transition-all"
              >
                {city}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
