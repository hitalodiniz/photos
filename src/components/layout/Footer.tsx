'use client';
import React from 'react';
import { Camera, ShieldCheck, FileText, Ban } from 'lucide-react';
import Link from 'next/link';
import { GALLERY_MESSAGES } from '@/core/config/messages';
import { useSegment } from '@/hooks/useSegment';

export default function Footer() {
  const { SegmentIcon, terms } = useSegment();

  const whatsappLink = `https://wa.me/5531993522018?text=${encodeURIComponent(
    GALLERY_MESSAGES.CONTACT_DEVELOPER(),
  )}`;

  return (
    <footer className="w-full py-6 md:py-4 bg-petroleum border-t border-white/5">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        {/* Container Principal */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
          {/* Lado Esquerdo: Branding + Identity */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <SegmentIcon className="w-5 h-5 text-champagne" />
              <span className="text-[16px] font-semibold text-white italic tracking-tight">
                {terms.site_name}
              </span>
            </div>

            <span className="text-white/90 text-[10px] md:text-[13px] italic tracking-wide text-center md:text-left">
              {terms.identity}
            </span>
          </div>

          {/* Lado Direito: Links com Ícones */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/privacidade"
              className="group flex items-center gap-1.5 text-white/90 text-[10px] md:text-[13px] hover:text-champagne transition-colors italic tracking-wide"
            >
              <ShieldCheck
                size={14}
                className="text-white/40 group-hover:text-champagne transition-colors"
              />
              <span className="underline underline-offset-4 decoration-white/10">
                Privacidade
              </span>
            </Link>

            <div className="w-[1px] h-3 bg-white/10" />

            <Link
              href="/termos"
              className="group flex items-center gap-1.5 text-white/90 text-[10px] md:text-[13px] hover:text-champagne transition-colors italic tracking-wide"
            >
              <FileText
                size={14}
                className="text-white/40 group-hover:text-champagne transition-colors"
              />
              <span className="underline underline-offset-4 decoration-white/10">
                Termos de Uso
              </span>
            </Link>

            <div className="w-[1px] h-3 bg-white/10" />

            <Link
              href="/politica-cancelamento"
              className="group flex items-center gap-1.5 text-white/90 text-[10px] md:text-[13px] hover:text-champagne transition-colors italic tracking-wide"
            >
              <Ban
                size={14}
                className="text-white/40 group-hover:text-champagne transition-colors"
              />
              <span className="underline underline-offset-4 decoration-white/10">
                Política de Cancelamento
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
