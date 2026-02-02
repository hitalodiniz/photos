'use client';
import React, { useState } from 'react';
import {
  Instagram,
  LayoutGrid,
  Menu,
  Camera,
  Share2,
  Check,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GoogleSignInButton } from '@/components/auth';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';

export default function EditorialToolbar() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Função Híbrida: Compartilhamento Nativo ou Cópia de Link
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sua Galeria',
          text: 'Confira este portfólio incrível!',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Compartilhamento cancelado');
      }
    } else {
      // Fallback para cópia de link se o navegador não suportar share nativo
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-petroleum/95 backdrop-blur-md border-b border-white/5 h-12 flex items-center justify-between px-4 md:px-10 transition-all shadow-2xl">
        {/* 1. LADO ESQUERDO: Branding */}
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => router.push('/')}
        >
          <Camera
            className="w-5 h-5 text-gold group-hover:scale-110 transition-transform"
            strokeWidth={1.5}
          />
          <span className="font-artistic text-[18px] font-semibold text-white italic tracking-tight">
            Sua Galeria
          </span>
        </div>

        {/* 2. LADO DIREITO: Ações Organizadas por Grupos */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* GRUPO DE DESTAQUE: Planos (À esquerda do social) */}
          <div className="flex items-center">
            <button
              onClick={() => router.push('/planos')}
              className="text-gold hover:text-white transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 bg-white/5 rounded-luxury border border-gold/20 hover:border-gold/50 h-9"
            >
              <LayoutGrid size={13} />
              <span className="hidden md:inline">Planos</span>
            </button>

            {/* BARRA SEPARADORA ELEGANTE */}
            <div className="h-4 w-[1px] bg-white/10 mx-4 hidden md:block" />
          </div>

          {/* GRUPO SOCIAL: Ícones Minimalistas */}
          <div className="hidden md:flex items-center gap-5">
            <a
              href="https://instagram.com"
              target="_blank"
              className="text-white/30 hover:text-white transition-colors"
            >
              <Instagram size={16} strokeWidth={1.5} />
            </a>
            <a
              href="https://wa.me/seu-numero"
              target="_blank"
              className="text-white/30 hover:text-green-400/80 transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>
            <button
              onClick={handleShare}
              className="text-white/30 hover:text-gold transition-colors"
            >
              {copied ? (
                <Check size={16} />
              ) : (
                <Share2 size={16} strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* GRUPO DE ACESSO: Login e Menu */}
          <div className="flex items-center gap-4 border-l border-white/10 pl-4">
            <div className="scale-90 origin-right">
              <GoogleSignInButton variant="minimal" />
            </div>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="text-white/40 hover:text-gold transition-colors"
            >
              <Menu size={22} strokeWidth={1} />
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Lateral Recolhido (Overlay) */}
      {/* Overlay de Menu Lateral */}
      <div
        className={`fixed inset-0 z-[110] transition-all duration-700 ${
          isMenuOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop Escuro (Fecha o menu ao clicar fora) */}
        <div
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-700 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Painel do Menu (30% de largura) */}
        <div
          className={`absolute top-0 right-0 h-full w-full md:w-[30%] bg-petroleum/95 backdrop-blur-2xl border-l border-white/5 p-8 md:p-12 flex flex-col justify-between transition-transform duration-500 ease-in-out shadow-2xl ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Cabeçalho do Menu */}
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-2 opacity-30">
              <Camera className="w-4 h-4 text-gold" />
              <span className=" text-sm text-white italic">Sua Galeria</span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-white/40 hover:text-gold transition-colors p-2"
            >
              <X size={24} strokeWidth={1.5} />
            </button>
          </div>

          {/* Links de Navegação */}
          <nav className="flex flex-col gap-8">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gold/40 font-semibold">
              Navegação
            </p>
            {['Nossos Planos', 'A Tecnologia', 'Suporte'].map((item, i) => (
              <button
                key={i}
                className="text-left text-2xl md:text-3xl  text-white italic hover:text-gold hover:translate-x-2 transition-all duration-300"
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Rodapé do Menu (Institucional) */}
          <div className="mt-auto pt-8 border-t border-white/5 space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold/60 font-semibold mb-4">
                Institucional
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/privacidade')}
                  className="text-left text-white/40 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                >
                  Privacidade
                </button>
                <button
                  onClick={() => router.push('/termos')}
                  className="text-left text-white/40 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                >
                  Termos de Uso
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center opacity-20 text-[9px] uppercase tracking-[0.3em] text-white">
              <span>© 2026</span>
              <span>Premium Experience</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
