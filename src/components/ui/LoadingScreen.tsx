'use client';

import { useEffect, useState } from 'react';
import { SEO_CONFIG } from '@/core/config/seo.config';
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

  const containerClasses = type === 'full' 
    ? 'fixed inset-0 z-[99999]' 
    : 'fixed top-[65px] inset-x-0 bottom-0 z-[9999]';

  return (
        <div
          className={`${containerClasses} flex flex-col items-center justify-center bg-petroleum/75 backdrop-blur-xl transition-all duration-700 ease-in-out ${
            fadeOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'
          }`}
        >
      {/* 🎯 Branding Superior - Estilo Editorial Gold */}
      <div
        className={`mb-12 md:mb-16 transition-transform duration-700 ${fadeOut ? '-translate-y-6' : 'translate-y-0'}`}
      >
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold text-center">
          {SEO_CONFIG.brandName}
        </h2>
      </div>

      {/* 🎯 Spinner Central com Pulso Suave */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-full border border-gold/10 animate-ping duration-[3000ms]" />
        <LoadingSpinner size="md" />
      </div>

      {/* 🎯 Mensagem de Status e Linha de Progresso Editorial */}
      <div
        className={`mt-12 md:mt-16 flex flex-col items-center gap-6 transition-transform duration-700 ${fadeOut ? 'translate-y-6' : 'translate-y-0'}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-luxury text-gold/90 text-center px-6 italic">
          {message}
        </p>
        
        {/* Linha de Progresso Minimalista */}
        <div className="relative w-16 md:w-20 h-[1px] bg-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-gold animate-progress-line" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes progress-line {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-line {
          animation: progress-line 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}