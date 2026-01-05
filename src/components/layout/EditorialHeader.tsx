'use client';
import React, { useEffect, useState } from 'react';
import { Camera, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EditorialHeaderProps {
  title: string;
  subtitle: React.ReactNode;
  showBackButton?: boolean; // Novo parâmetro opcional
}

export default function EditorialHeader({
  title,
  subtitle,
  showBackButton = true, // Valor padrão é verdadeiro
}: EditorialHeaderProps) {
  const router = useRouter();

  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const hasHistory =
      typeof window !== 'undefined' && window.history.length > 1;
    // Opcional: Verifica se o usuário veio de dentro do seu próprio site
    const isInternalNavigation = document.referrer.includes(
      window.location.host,
    );

    if (hasHistory || isInternalNavigation) {
      setCanGoBack(true);
    }
  }, []);

  return (
    <header className="relative flex-none pt-8 md:pt-12 pb-0 w-full max-w-6xl mx-auto">
      {/* Exibição condicional do botão voltar */}
      {showBackButton && canGoBack && (
        <div className="fixed left-4 md:left-10 top-8 md:top-12 z-50 animate-in fade-in slide-in-from-left-4 duration-500">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 text-[10px] md:text-[12px] font-black tracking-[0.3em] text-[#D4AF37] bg-black/40 border border-gold/20 rounded-full hover:bg-black/60 hover:border-gold/40 transition-all duration-300 backdrop-blur-xl group uppercase shadow-2xl"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1.5 transition-transform duration-300"
            />
            <span>Voltar</span>
          </button>
        </div>
      )}

      {/* Conteúdo Centralizado */}
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
          <h1
            className="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow-2xl italic"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
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
