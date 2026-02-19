'use client';

import { GALLERY_MESSAGES } from '@/core/config/messages';
import { Photographer, Galeria } from '@/core/types/galeria';
import { getCreatorProfileUrl } from '@/core/utils/url-helper';
import { usePlan } from '@/core/context/PlanContext';
import { getGalleryPermission } from '@/core/utils/plan-helpers';
import { Globe, User } from 'lucide-react';
import React, { useMemo } from 'react';
import { useSegment } from '@/hooks/useSegment';

export default function GaleriaFooter({
  galeria,
  photographer,
  title,
  showTopButton = true,
}: {
  galeria: Galeria;
  photographer: Photographer;
  title?: string;
  showTopButton?: boolean;
}) {
  const { permissions } = usePlan();
  const { terms } = useSegment();

  const displayLevel = useMemo(() => {
    if (!galeria) return permissions.socialDisplayLevel;
    return (
      getGalleryPermission(galeria, 'socialDisplayLevel') ||
      permissions.socialDisplayLevel
    );
  }, [galeria, permissions.socialDisplayLevel]);

  if (!photographer || !galeria) return null;

  const hasSocial = displayLevel === 'social' || displayLevel === 'full';
  const hasWebsite = displayLevel === 'full';

  return (
    <footer className="relative z-20 w-full mt-2 bg-petroleum border-t border-white/5">
      <div className="max-w-[1600px] mx-auto flex flex-col items-center py-6 gap-4">
        {/* 1. Top Button - Compacto */}
        {showTopButton && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-all"
          >
            <div className="p-2 rounded-full border border-white/10 group-hover:border-champagne transition-all">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F3E5AB"
                strokeWidth="2"
              >
                <path d="m18 15-6-6-6 6" />
              </svg>
            </div>
            <span className="text-[8px] uppercase tracking-[0.2em] font-semibold text-champagne">
              Topo
            </span>
          </button>
        )}

        {/* 2. Conteúdo Central - Linha Única no Desktop */}
        <div className="flex flex-col items-center text-center px-4">
          {title && (
            <h3 className="italic text-base md:text-xl text-white/90 font-light mb-1">
              {title}
            </h3>
          )}

          <div className="flex items-center gap-3 text-white/70 text-[11px] md:text-sm">
            <span className="italic">Registrado por</span>
            <span className="text-white font-semibold tracking-tight uppercase text-[12px] md:text-base">
              {photographer?.full_name}
            </span>

            <div className="w-[1px] h-3 bg-white/50" />

            {/* Ícones Minimalistas */}
            <div className="flex items-center gap-3">
              {hasSocial && photographer?.phone_contact && (
                <a
                  href={`https://wa.me/${photographer.phone_contact.replace(/\D/g, '')}`}
                  target="_blank"
                  className="hover:text-[#25D366] transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              )}
              {hasSocial && photographer?.instagram_link && (
                <a
                  href={`https://instagram.com/${photographer.instagram_link.replace('@', '')}`}
                  target="_blank"
                  className="hover:text-white transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204 0.013-3.583 0.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              <a
                href={getCreatorProfileUrl(photographer)}
                target="_blank"
                className="hover:text-champagne transition-colors"
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
                  className="hover:text-blue-400 transition-colors"
                >
                  <Globe size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Bar - Minimalista */}
      <div className="w-full border-t border-white/5 py-4 px-6 bg-black/20">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-white/70 uppercase tracking-widest font-medium">
          <span>
            © {new Date().getFullYear()} — Todos os direitos reservados
          </span>

          {!permissions.removeBranding ? (
            <div className="flex items-center gap-1.5">
              <span className="text-white/70">Powered by</span>
              <a
                href={`https://${process.env.NEXT_PUBLIC_MAIN_DOMAIN}`}
                target="_blank"
                className="text-champagne italic hover:text-white transition-colors"
              >
                {terms.site_name}
              </a>
            </div>
          ) : (
            <span className="opacity-30">Galeria Profissional</span>
          )}
        </div>
      </div>
    </footer>
  );
}
