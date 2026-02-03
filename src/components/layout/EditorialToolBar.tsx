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
import AuthButton from '../auth/AuthButton';

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
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-petroleum backdrop-blur-md border-b border-white/5 h-12 flex items-center justify-between px-4 md:px-10">
        {/* LADO ESQUERDO: Branding Limpo */}
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => router.push('/')}
        >
          <Camera
            className="w-5 h-5 text-champagne group-hover:scale-110 transition-transform"
            strokeWidth={1.5}
          />
          <span className="text-[18px] font-semibold text-white italic tracking-tight">
            Sua Galeria
          </span>
        </div>

        {/* LADO DIREITO: Ações Minimalistas */}
        {/* LADO DIREITO: Ações Minimalistas Padronizadas */}
        <div className="flex items-center">
          {/* GRUPO SOCIAL (Desktop) */}
          <div className="hidden md:flex items-center gap-5 px-4 border-r border-white/10">
            <a
              href="https://instagram.com"
              target="_blank"
              className="text-white hover:text-white transition-all"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://wa.me/seu-numero"
              target="_blank"
              className="text-white hover:text-green-400 transition-all"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>
            <button
              onClick={handleShare}
              className="!px-0 text-white hover:text-champagne transition-all bg-transparent border-none"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* 🎯 HUB DE AÇÕES: Planos e Login Lado a Lado */}
          <div className="flex items-center gap-1 pl-2">
            {/* Botão Planos - Agora vizinho direto do Login */}
            <button
              onClick={() => router.push('/planos')}
              className="flex items-center gap-2 px-4 py-2 rounded-luxury bg-transparent hover:bg-white/5 transition-all group"
            >
              <LayoutGrid
                size={16}
                className="text-champagne"
                strokeWidth={1.5}
              />
              <span className="text-[10px] font-semibold uppercase tracking-luxury-widest text-white">
                Planos
              </span>
            </button>

            {/* Divisor vertical sutil entre os dois botões principais */}
            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            {/* Componente de Login (Entrar) */}
            <AuthButton variant="minimal" />

            {/* Menu Hambúrguer */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="text-white hover:text-champagne transition-colors p-2 ml-1"
            >
              <Menu size={22} strokeWidth={1} />
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay de Menu Lateral */}
      <div
        className={`fixed inset-0 z-[110] transition-all duration-700 ${
          isMenuOpen ? 'visible' : 'invisible'
        }`}
      >
        {/* Backdrop Escuro Suave */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-700 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Painel do Menu - Mesma cor bg-petroleum da Toolbar */}
        <div
          className={`absolute top-0 right-0 h-full w-full md:w-[320px] bg-petroleum border-l border-white/5 p-8 flex flex-col transition-transform duration-500 ease-in-out shadow-2xl ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Cabeçalho: Identidade Visual Toolbar */}
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-champagne" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white italic">
                Sua Galeria
              </span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-white hover:text-champagne transition-colors p-1"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* Navegação Principal com Ícones */}
          <nav className="flex flex-col gap-2">
            {[
              { label: 'Nossos Planos', icon: LayoutGrid, path: '/planos' },
              { label: 'A Tecnologia', icon: Camera, path: '/tech' },
              { label: 'Suporte & Ajuda', icon: Share2, path: '/suporte' },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  router.push(item.path);
                  setIsMenuOpen(false);
                }}
                className="group flex items-center gap-4 px-4 py-3 rounded-luxury hover:bg-white/5 text-white hover:text-champagne transition-all"
              >
                <item.icon
                  size={16}
                  strokeWidth={1.5}
                  className="text-champagne group-hover:text-champagne transition-colors"
                />
                <span className="text-[11px] font-semibold uppercase tracking-luxury-widest">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          {/* Rodapé: Estilo Editorial Minimalista */}
          <div className="mt-auto pt-8 border-t border-white/5 space-y-8">
            {/* Bloco de Integração */}
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

            {/* Links Legais e Copyright */}
            <div className="space-y-4 px-1">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => router.push('/privacidade')}
                  className="text-left text-white text-[9px] uppercase tracking-widest hover:text-white transition-colors"
                >
                  Políticas de Privacidade
                </button>
                <button
                  onClick={() => router.push('/termos')}
                  className="text-left text-white text-[9px] uppercase tracking-widest hover:text-white transition-colors"
                >
                  Termos de Serviço
                </button>
              </div>

              <div className="flex justify-between items-center text-[9px] uppercase tracking-luxury-widest text-white pt-4">
                <span>© 2026</span>
                <span className="italic">Experiência Premium</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
