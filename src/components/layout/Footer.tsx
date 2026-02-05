'use client';
import React from 'react';
import { Camera } from 'lucide-react';
import Link from 'next/link';
import { GALLERY_MESSAGES } from '@/core/config/messages';

export default function Footer() {
  const whatsappLink = `https://wa.me/5531993522018?text=${encodeURIComponent(
    GALLERY_MESSAGES.CONTACT_DEVELOPER(),
  )}`;

  return (
    <footer className="w-full py-6 md:py-4 bg-petroleum border-t border-white/5">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 md:gap-4">
        {/* Lado Esquerdo: Branding e Texto Legal */}
        <div className="flex flex-col items-center md:items-start gap-3 md:gap-1">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#F3E5AB]" />
            <span className="text-[16px] font-semibold text-white italic">
              Sua Galeria
            </span>
          </div>

          {/* Container de Links: flex-wrap para mobile evita quebra de layout */}
          <div className="text-white/90 text-[10px] md:text-[13px] flex flex-wrap justify-center md:justify-start items-center gap-x-3 gap-y-2 italic tracking-wide text-center md:text-left">
            <span className="w-full md:w-auto block md:inline mb-1 md:mb-0">
              Entregas profissionais e personalizadas
            </span>
            <span className="hidden md:inline text-white/20">•</span>
            <span>© {new Date().getFullYear()}</span>
            <div className="w-[1px] h-3 bg-white/10 hidden md:block" />
            <Link
              href="/privacidade"
              className="hover:text-[#F3E5AB] transition-colors underline underline-offset-4 decoration-white/10"
            >
              Privacidade
            </Link>
            <Link
              href="/termos"
              className="hover:text-[#F3E5AB] transition-colors underline underline-offset-4 decoration-white/10"
            >
              Termos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
