'use client';

import { useEffect, useState } from 'react';
import { getSEOBySegment } from '@/core/config/seo.config';
import { SegmentType } from '@/core/config/segments';
import LoadingSpinner from './LoadingSpinner';

interface LoadingScreenProps {
  message?: string;
  fadeOut?: boolean;
  type?: 'full' | 'content';
}

export default function LoadingScreen({
  message = 'Verificando seu acesso',
  fadeOut = false,
  type = 'full',
}: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  // 🎯 CORREÇÃO: Usamos diretamente a variável de ambiente para garantir que o
  // valor no Servidor e no Cliente seja IDÊNTICO durante a hidratação.
  const segment =
    (process.env.NEXT_PUBLIC_APP_SEGMENT as SegmentType) || 'PHOTOGRAPHER';
  const seo = getSEOBySegment(segment);

  useEffect(() => {
    if (!fadeOut) {
      document.body.classList.remove('js-ready');
    }

    if (fadeOut) {
      document.body.classList.add('js-ready');
      const timer = setTimeout(() => setIsVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [fadeOut]);

  if (!isVisible) return null;

  const containerClasses =
    type === 'full'
      ? 'fixed inset-0 z-[99999]'
      : 'fixed top-[65px] inset-x-0 bottom-0 z-[9999]';

  return (
    <div
      className={`${containerClasses} flex flex-col items-center justify-center transition-all duration-1000 bg-petroleum`}
    >
      {/* 🌊 Efeito de profundidade */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-petroleum/10 via-transparent to-black/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        {/* 🎯 Branding Estático (Baseado no Segmento da ENV) */}
        <div
          className={`mb-12 transition-transform duration-1000 ${fadeOut ? '-translate-y-4' : 'translate-y-0'}`}
        >
          <h2 className="text-[10px] font-medium uppercase tracking-luxury-widest text-champagne text-center">
            {seo.brandName}
          </h2>
        </div>

        {/* 🎯 Spinner Central */}
        <div className="relative flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>

        {/* 🎯 Mensagem de Status */}
        <div
          className={`mt-12 flex flex-col items-center gap-8 transition-transform duration-1000 ${fadeOut ? 'translate-y-4' : 'translate-y-0'}`}
        >
          <p className="text-[10px] font-light uppercase tracking-luxury-widest text-champagne text-center px-8 italic">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
