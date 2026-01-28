'use client';
import React from 'react';
import { Camera, Instagram } from 'lucide-react';
import Link from 'next/link';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { GALLERY_MESSAGES } from '@/core/config/messages';

export default function Footer() {
  const whatsappLink = `https://wa.me/5531993522018?text=${encodeURIComponent(
    GALLERY_MESSAGES.CONTACT_DEVELOPER(),
  )}`;

  return (
    <footer className="flex-none w-full py-4 px-6 bg-petroleum border-t border-white/10 font-montserrat">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Lado Esquerdo: Marca e Links */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#F3E5AB]" />
            <span className="font-artistic text-[16px] font-semibold text-white italic">
              Sua Galeria
            </span>
          </div>

          <div className="text-white/70 text-[11px] md:text-[13px] flex items-center gap-3 italic tracking-wide">
            <span>© {new Date().getFullYear()}</span>
            <div className="w-[1px] h-3 bg-white/10" />
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

        {/* Lado Direito: Redes Sociais Compactas */}
        <div className="flex items-center gap-3">
          <SocialIcon
            icon={<Instagram size={18} />}
            title="Instagram"
            href="https://instagram.com"
          />
          <SocialIcon
            icon={<WhatsAppIcon className="w-4 h-4" />}
            title="WhatsApp"
            href={whatsappLink}
          />
        </div>
      </div>
    </footer>
  );
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
      className="p-2.5 bg-white/5 rounded-full text-[#F3E5AB] border border-white/10 transition-all 
      duration-300 hover:bg-[#F3E5AB] hover:text-petroleum shadow-xl"
      title={title}
    >
      {icon}
    </a>
  );
}
