'use client';
import React from 'react';
import { Camera, Instagram, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { GALLERY_MESSAGES } from '@/core/config/messages';

export default function Footer() {
  const whatsappLink = `https://wa.me/5531993522018?text=${encodeURIComponent(
    GALLERY_MESSAGES.CONTACT_DEVELOPER(),
  )}`;
  return (
    <footer className="flex-none w-full py-8 px-6 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm border-t border-white/10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-10">
        {/* Lado Esquerdo: Logo e Info */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-[#F3E5AB]" />
            <span className="font-artistic text-md md:text-[16px] font-semibold text-white italic">
              Sua Galeria
            </span>
          </div>

          <div
            className="text-white/60 text-xs md:text-sm flex flex-wrap justify-center md:justify-start gap-1 md:gap-2
           italic"
          >
            <span>
              © {new Date().getFullYear()} • Integrado com Google Drive™
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/privacidade"
                className="hover:text-[#F3E5AB] transition-colors underline underline-offset-8 decoration-white/10"
              >
                Privacidade
              </Link>
              <span className="text-white/20">•</span>
              <Link
                href="/termos"
                className="hover:text-[#F3E5AB] transition-colors underline underline-offset-8 decoration-white/10"
              >
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>

        {/* Lado Direito: Redes Sociais */}
        <div className="flex items-center gap-5">
          <SocialIcon
            icon={<Instagram size={20} />}
            title="Instagram"
            href="https://instagram.com" // Ajuste o link real aqui
          />
          <SocialIcon
            icon={<MessageCircle size={20} />}
            title="WhatsApp"
            href={whatsappLink} // Ajuste o link real aqui
          />
        </div>
      </div>
    </footer>
  );
}

{
  /* Componente Interno SocialIcon Padronizado */
}
function SocialIcon({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="p-4 bg-white/5 rounded-full text-[#F3E5AB] border border-white/5 transition-all 
      duration-500 hover:text-black hover:bg-champagne-dark shadow-2xl"
      title={title}
    >
      {icon}
    </a>
  );
}
