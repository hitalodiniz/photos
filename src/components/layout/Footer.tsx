'use client';
import React from 'react';
import { Camera } from 'lucide-react';
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
        {/* Container Principal: Flexbox com justify-between */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 md:gap-8">
          {/* Lado Esquerdo: Branding + Identity */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <SegmentIcon className="w-5 h-5 text-champagne" />
              <span className="text-[16px] font-semibold text-white italic">
                {terms.site_name}
              </span>
            </div>

            <span className="text-white/90 text-[10px] md:text-[13px] italic tracking-wide text-center md:text-left">
              {terms.identity}
            </span>
          </div>

          {/* Lado Direito: Links */}
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              href="/privacidade"
              className="text-white/90 text-[10px] md:text-[13px] hover:text-champagne transition-colors underline underline-offset-4 decoration-white/10 italic tracking-wide"
            >
              Privacidade
            </Link>

            <div className="w-[1px] h-3 bg-white/10" />

            <Link
              href="/termos"
              className="text-white/90 text-[10px] md:text-[13px] hover:text-champagne transition-colors underline underline-offset-4 decoration-white/10 italic tracking-wide"
            >
              Termos de Uso
            </Link>

            <div className="w-[1px] h-3 bg-white/10" />

            <Link
              href="/politica-cancelamento"
              className="text-white/90 text-[10px] md:text-[13px] hover:text-champagne transition-colors underline underline-offset-4 decoration-white/10 italic tracking-wide"
            >
              Política de Cancelamento
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
