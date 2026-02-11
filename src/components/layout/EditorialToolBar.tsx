'use client';

import React, { useState, useEffect } from 'react';
import {
  Instagram,
  LayoutGrid,
  Menu,
  Share2,
  Check,
  X,
  Layout,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import AuthButton from '../auth/AuthButton';
import { useSegment } from '@/hooks/useSegment';

export default function EditorialToolbar() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // 🎯 Estado para controlar hidratação
  const { SegmentIcon, terms } = useSegment();

  // 🎯 Garante que o componente só renderize ícones dinâmicos após o mount no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: terms.site_name,
          text: `Confira este portfólio incrível!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Compartilhamento cancelado');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-petroleum backdrop-blur-md border-b border-white/5 h-12 flex items-center justify-between px-4 md:px-10">
        {/* LADO ESQUERDO: Branding */}
        <div
          className="flex items-center gap-2 cursor-pointer group shrink-0"
          onClick={() => router.push('/')}
        >
          {/* 🎯 Só renderiza o ícone do segmento após montar para evitar erro de hidratação */}
          {mounted && SegmentIcon && (
            <SegmentIcon
              className="w-7 h-7 text-champagne group-hover:scale-110 transition-transform"
              strokeWidth={1.5}
            />
          )}
          <span className="text-[16px] md:text-[18px] font-semibold text-white italic tracking-tight">
            {terms.site_name}
          </span>
        </div>

        {/* LADO DIREITO: Ações */}
        <div className="flex items-center">
          <div className="hidden md:flex items-center gap-5 px-4 border-r border-white/10">
            <a
              href="https://instagram.com"
              target="_blank"
              className="text-white"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://wa.me/seu-numero"
              target="_blank"
              className="text-white"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>
            <button
              onClick={handleShare}
              className="!px-0 text-white bg-transparent border-none"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1 pl-1 md:pl-2">
            <button
              onClick={() => router.push('/planos')}
              className="flex items-center gap-2 px-2 md:px-4 py-2 rounded-luxury bg-transparent hover:bg-white/5 transition-all"
            >
              <LayoutGrid
                size={18}
                className="text-champagne"
                strokeWidth={1.5}
              />
              <span className="hidden md:block text-[10px] font-semibold uppercase tracking-luxury-widest text-white">
                Planos
              </span>
            </button>

            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            <div className="scale-90 md:scale-100">
              <AuthButton variant="minimal" />
            </div>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="text-white hover:text-champagne transition-colors p-2"
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay de Menu Lateral */}
      <div
        className={`fixed inset-0 z-[110] transition-all duration-700 ${isMenuOpen ? 'visible' : 'invisible'}`}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-700 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMenuOpen(false)}
        />

        <div
          className={`absolute top-0 right-0 h-full w-[85%] md:w-[320px] bg-petroleum border-l border-white/5 p-6 md:p-8 flex flex-col transition-transform duration-500 ease-in-out shadow-2xl ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-2">
              {mounted && SegmentIcon && (
                <SegmentIcon
                  className="w-4 h-4 text-champagne"
                  strokeWidth={1.5}
                />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white italic">
                {terms.site_name}
              </span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-white p-1"
            >
              <X size={24} strokeWidth={1.5} />
            </button>
          </div>

          {/* Navegação */}
          <nav className="flex flex-col gap-1">
            {[
              { label: 'Nossos Planos', icon: LayoutGrid, path: '/planos' },
              { label: 'Tecnologia e Suporte', icon: Share2, path: '/suporte' },
            ].map((item, i) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    router.push(item.path);
                    setIsMenuOpen(false);
                  }}
                  className="group flex items-center gap-4 px-4 py-4 rounded-luxury hover:bg-white/5 text-white active:bg-white/10 transition-all"
                >
                  <IconComponent size={18} className="text-champagne" />
                  <span className="text-[12px] md:text-[11px] font-semibold uppercase tracking-luxury-widest">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Rodapé Menu */}
          <div className="mt-auto pt-8 border-t border-white/5 space-y-6">
            <div className="px-4 py-4 rounded-luxury bg-white/[0.02] border border-white/5">
              <p className="text-champagne text-[8px] uppercase tracking-[0.3em] font-semibold mb-3 italic">
                Integração
              </p>
              <div className="flex items-center gap-3">
                <WhatsAppIcon className="w-3 h-3" />
                <span className="text-white text-[10px] font-semibold uppercase tracking-widest">
                  Google Drive™ Partner
                </span>
              </div>
            </div>

            <div className="space-y-4 px-1 pb-4">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/privacidade')}
                  className="text-left text-white/60 text-[10px] uppercase tracking-widest"
                >
                  Privacidade
                </button>
                <button
                  onClick={() => router.push('/termos')}
                  className="text-left text-white/60 text-[10px] uppercase tracking-widest"
                >
                  Termos
                </button>
              </div>
              <div className="flex justify-between items-center text-[9px] uppercase tracking-luxury-widest text-white/40 pt-2">
                <span>© 2026</span>
                <span className="italic">Premium</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
