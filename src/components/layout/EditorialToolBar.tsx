'use client';
import React, { useState } from 'react';
import {
  ShieldCheck,
  Instagram,
  Check,
  Share2,
  Zap,
  HelpCircle,
  Terminal,
  LayoutGrid,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { useRouter } from 'next/navigation';

interface EditorialToolbarProps {
  isScrolled: boolean;
}

export default function EditorialToolbar({
  isScrolled,
}: EditorialToolbarProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sticky top-0 z-[100] w-full pointer-events-auto">
      <div
        className={`
          w-full bg-petroleum backdrop-blur-md border-b border-white/10 shadow-2xl transition-all duration-500
          ${isScrolled ? 'h-12' : 'h-14'}
        `}
      >
        <div className="flex items-center w-full max-w-[1600px] pl-12 pr-44 gap-3 h-full mx-auto justify-between">
          {/* Lado Esquerdo: Branding/Segurança */}
          <div className="flex items-center gap-4 pr-4 shrink-0 h-full">
            {/* <div className="flex items-center gap-4 border-r border-white/10 pr-4 shrink-0 h-full"> */}
            {/* <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-gold" />
              <span className="text-[10px] md:text-[11px] uppercase font-bold tracking-luxury-widest text-white/70 hidden lg:block">
                Acesso Protegido
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-luxury px-3 h-8 border border-white/10">
              <Zap size={12} className="text-gold" />
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-luxury-widest">
                Editorial 2026
              </span>
            </div> */}
            <button
              onClick={() => router.push('/planos')}
              className="flex items-center justify-center rounded-luxury h-10 border border-white/10 bg-white/5 text-white hover:bg-gold hover:text-black transition-all w-10 md:w-28 gap-2 group"
            >
              {/* Ícone que remete a pacotes/grid de fotos */}
              <LayoutGrid
                size={16}
                className="group-hover:scale-110 transition-transform"
              />

              <span className="text-[10px] font-bold uppercase tracking-luxury-widest hidden lg:block">
                Planos
              </span>

              {/* O ponto de pulso agora fica discreto ao lado do texto */}
              <div className="w-1 h-1 rounded-full bg-gold group-hover:bg-black animate-pulse hidden lg:block" />
            </button>
          </div>

          <div className="flex-1" />

          {/* Lado Direito: Ações Sociais e CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {/* INSTAGRAM */}
            <a
              href="https://instagram.com/seuusuario"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-luxury h-10 border border-white/10 bg-white/5 text-white hover:bg-gradient-to-tr hover:from-purple-600 hover:to-pink-500 hover:text-white transition-all w-10 md:w-28 gap-2 group"
            >
              <Instagram
                size={16}
                className="group-hover:scale-110 transition-transform"
              />
              <span className="text-[10px] uppercase font-bold tracking-luxury-widest hidden lg:block">
                Instagram
              </span>
            </a>

            {/* WHATSAPP */}
            <button
              onClick={() => window.open('https://wa.me/seu-numero', '_blank')}
              className="flex items-center justify-center rounded-luxury h-10 border border-white/10 bg-white/5 text-white hover:bg-green-600 hover:text-white transition-all w-10 md:w-28 gap-2 group"
            >
              <WhatsAppIcon className="text-current w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] uppercase font-bold tracking-luxury-widest hidden lg:block">
                WhatsApp
              </span>
            </button>

            {/* LINK/SHARE */}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center rounded-luxury h-10 border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black transition-all w-10 md:w-24 gap-2 group"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Share2 size={16} />
              )}
              <span className="text-[10px] uppercase font-bold tracking-luxury-widest hidden lg:block">
                {copied ? 'Copiado' : 'Link'}
              </span>
            </button>

            {/* CTA PRINCIPAL */}
            {/* 🎯 NOVO BOTÃO: ACESSO VIA API KEY */}
            <div className="relative pl-2 border-l border-white/10 ml-1">
              <button
                onClick={() => router.push('/auth/api-login')} // Ajuste para sua rota real
                className="flex items-center justify-center rounded-luxury bg-gold text-black h-10 font-bold shadow-xl hover:bg-white transition-all w-32 md:w-44 gap-2 px-4 group"
              >
                <Terminal
                  size={15}
                  className="group-hover:translate-x-0.5 transition-transform"
                  strokeWidth={2.5}
                />
                <span className="text-[10px] uppercase font-bold tracking-luxury-widest whitespace-nowrap">
                  Acesso API Key
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
