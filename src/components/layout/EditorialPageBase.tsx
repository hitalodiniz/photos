'use client';
import React, { useState, useEffect } from 'react';
import { Footer } from '@/components/layout';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface EditorialPageBaseProps {
  children: React.ReactNode;
  heroImageUrl?: string; // Imagem fixa de luxo para o fundo
  loadingMessage?: string;
}

export default function EditorialPageBase({
  children,
  heroImageUrl = '/images/editorial-bg.jpg', // Uma imagem padrão de alta qualidade
  loadingMessage = 'Carregando experiência...',
}: EditorialPageBaseProps) {
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-black font-montserrat overflow-x-hidden">
      <LoadingScreen message={loadingMessage} fadeOut={!isPageLoading} />

      {/* 1. BACKGROUND LAYER (Identico à Galeria View) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 brightness-[0.4] scale-[1.05]"
          style={{
            backgroundImage: `url('${heroImageUrl}')`,
            backgroundPosition: 'center 40%',
          }}
        />
        {/* Overlay Editorial: Garante que os cards brancos e azuis saltem da tela */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/40 to-transparent backdrop-blur-[3px]" />
      </div>

      {/* 2. CONTENT LAYER */}
      <div
        className={`relative z-10 flex flex-col min-h-screen transition-opacity duration-1000 ${isPageLoading ? 'opacity-0' : 'opacity-100'}`}
      >
        <main className="flex-grow flex flex-col">{children}</main>

        <Footer />
      </div>
    </div>
  );
}
