'use client';
import React, { useEffect, useState } from 'react';
import { Camera, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EditorialHeaderProps {
  title: string;
  subtitle: React.ReactNode;
  showBackButton?: boolean;
}

export default function EditorialHeader({
  title,
  subtitle,
  showBackButton = true,
}: EditorialHeaderProps) {
  const router = useRouter();
  const [originUrl, setOriginUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const referrer = document.referrer;
    const host = window.location.host;
    const currentUrl = window.location.href;

    // 1. Verifica se existe referrer e se é do mesmo domínio
    const isInternal = referrer && referrer.includes(host);

    // 2. Compara a URL completa para evitar que a página aponte para si mesma
    // Usamos URL() para normalizar (remover barras extras ou queries que causem falso positivo)
    try {
      const referrerPath = new URL(referrer).pathname;
      const currentPath = window.location.pathname;

      if (isInternal && referrerPath !== currentPath) {
        setOriginUrl(referrer);
      } else {
        // Se for a mesma página (ex: F5) ou externo, oculta o botão
        setOriginUrl(null);
      }
    } catch (e) {
      setOriginUrl(null);
    }
  }, []);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();

    if (originUrl) {
      // Força a ida para a URL de origem exata capturada no mount
      router.push(originUrl);
    } else {
      // Fallback de segurança caso algo falhe
      router.push('/');
    }
  };

  return (
    <header className="relative flex-none pt-8 md:pt-12 pb-0 w-full max-w-6xl mx-auto">
      {/* Botão Voltar: Só exibe se as duas condições forem verdadeiras */}
      {/* Usamos originUrl como condição de exibição. 
          Se for null, o botão nem renderiza (evita botão morto) 
      */}
      {showBackButton && originUrl && (
        <div className="fixed left-4 md:left-10 top-8 md:top-12 z-50 animate-in fade-in slide-in-from-left-4 duration-500">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 text-[10px] md:text-[12px] font-semibold tracking-wider text-[#D4AF37] bg-black/40 border border-gold/20 rounded-full hover:bg-black/60 hover:border-gold/40 transition-all duration-300 backdrop-blur-xl group uppercase shadow-2xl"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1.5 transition-transform duration-300"
            />
            <span>Voltar</span>
          </button>
        </div>
      )}

      <div className="flex flex-col items-center justify-center text-center gap-2 md:gap-6">
        <Link
          href="/"
          className="transition-transform duration-300 hover:scale-110 active:scale-95 z-30"
        >
          <div className="p-4 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
            <Camera className="text-[#F3E5AB] w-6 h-6 md:w-10 md:h-10 drop-shadow-[0_0_15px_rgba(243,229,171,0.3)]" />
          </div>
        </Link>
        <div className="space-y-4">
          <h1 className="font-artistic text-3xl md:text-5xl font-semibold text-white tracking-tight drop-shadow-2xl italic">
            {title}
          </h1>
          <div className="text-[14px] md:text-[18px] text-white/90 tracking-wide italic md:p-2">
            {subtitle}
          </div>
        </div>
      </div>
    </header>
  );
}
