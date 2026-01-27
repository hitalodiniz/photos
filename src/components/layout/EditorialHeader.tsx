'use client';
import React, { useEffect, useState } from 'react';
import { Camera, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EditorialHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  showBackButton?: boolean;
  iconPosition?: 'top' | 'side'; // 🎯 Parâmetro de posição
}

export default function EditorialHeader({
  title,
  subtitle,
  showBackButton = true,
  iconPosition = 'side', // 🎯 Padrão assumido: esquerda (side)
}: EditorialHeaderProps) {
  const router = useRouter();
  const [originUrl, setOriginUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const referrer = document.referrer;
    const host = window.location.host;

    try {
      const referrerPath = new URL(referrer).pathname;
      const currentPath = window.location.pathname;
      if (referrer && referrer.includes(host) && referrerPath !== currentPath) {
        setOriginUrl(referrer);
      } else {
        setOriginUrl(null);
      }
    } catch {
      setOriginUrl(null);
    }
  }, []);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (originUrl) {
      router.push(originUrl);
    } else {
      router.push('/');
    }
  };

  // Lógica de classes baseada na posição
  const isTop = iconPosition === 'top';

  return (
    <header className="relative flex-none pt-8 md:pt-12 pb-0 w-full max-w-6xl mx-auto px-4 font-montserrat">
      {/* Botão Voltar */}
      {showBackButton && originUrl && (
        <div className="fixed left-4 md:left-10 top-8 md:top-12 z-50 animate-in fade-in slide-in-from-left-4 duration-500">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 text-[10px] md:text-[12px] font-semibold tracking-wider text-white bg-black/40 border border-gold/20 rounded-full hover:bg-black/60 hover:border-gold/40 transition-all duration-300 backdrop-blur-xl group uppercase shadow-2xl"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1.5 transition-transform duration-300"
            />
            <span>Voltar</span>
          </button>
        </div>
      )}

      <div className="flex flex-col items-center justify-center text-center">
        {/* Container Dinâmico: Column se for TOP, Row se for SIDE */}
        <div
          className={`flex items-center justify-center ${isTop ? 'flex-col gap-4 mb-6' : 'flex-row gap-4 mb-4'}`}
        >
          <Link
            href="/"
            className="transition-all duration-300 hover:scale-110 active:scale-95 z-30 shrink-0"
          >
            <Camera
              className="text-[#F3E5AB] w-8 h-8 md:w-12 md:h-12 drop-shadow-[0_0_15px_rgba(243,229,171,0.4)]"
              strokeWidth={1.2}
            />
          </Link>

          <h1 className="font-artistic text-3xl md:text-5xl font-semibold text-white tracking-tight drop-shadow-2xl italic leading-none">
            {title}
          </h1>
        </div>

        {/* Subtítulo */}
        {subtitle && (
          <div className="text-[14px] md:text-[18px] text-white/90 tracking-wide italic md:p-2 max-w-3xl leading-relaxed">
            {subtitle}
          </div>
        )}
      </div>
    </header>
  );
}
