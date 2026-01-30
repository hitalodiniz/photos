'use client';
import React, { useState, useEffect } from 'react';
import EditorialHeader from '@/components/layout/EditorialHeader';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { Footer } from '@/components/layout';
import {
  ShieldCheck,
  Instagram,
  Share2,
  Check,
  Zap,
  HelpCircle,
} from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import EditorialToolbar from './EditorialToolBar';

interface EditorialPageProps {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  loadingMessage?: string;
  showToolbar?: boolean;
  bgImage?: string;
}

export default function EditorialView({
  title,
  subtitle,
  children,
  loadingMessage = 'Preparando experiência...',
  showToolbar = true,
  bgImage,
}: EditorialPageProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    /* 🎯 AJUSTE: bg-white como fundo principal */
    <div className="relative min-h-screen w-full flex flex-col bg-white font-montserrat overflow-x-hidden transition-colors duration-500">
      <LoadingScreen message={loadingMessage} fadeOut={isMounted} />

      <div
        className={`relative z-10 flex flex-col min-h-screen transition-opacity duration-700 ${
          isMounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* 1. HEADER HERO (Mantém o fundo escuro interno da foto para contraste do título) */}
        <div className="flex-none">
          <EditorialHeader
            title={title}
            subtitle={subtitle}
            showBackButton={false}
            bgImage={bgImage}
          />
        </div>

        {/* 2. TOOLBAR EDITORIAL (Sincronizada com ToolBarDesktop) */}
        {showToolbar && <EditorialToolbar isScrolled={isScrolled} />}

        {/* 3. MAIN CONTENT */}
        {/* 🎯 AJUSTE: Removido gradiente escuro pesado para favorecer o fundo branco */}
        <main className="flex-grow flex items-center py-2 pb-0 bg-slate-50/50">
          <div className="max-w-[1600px] mx-auto w-full px-4">{children}</div>
        </main>

        <div className="flex-none">
          <Footer />
        </div>
      </div>
    </div>
  );
}
