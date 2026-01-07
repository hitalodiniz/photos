'use client';

import { Camera } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SEO_CONFIG } from '@/core/config/seo.config';

interface LoadingScreenProps {
  message?: string;
  fadeOut?: boolean;
}

export default function LoadingScreen({
  message = 'Verificando seu acesso',
  fadeOut = false,
}: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (fadeOut) {
      const timer = setTimeout(() => setIsVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [fadeOut]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-all duration-700 ease-in-out ${
        fadeOut ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. NOME DO SITE (TOPO) - Mesmo estilo da message */}
      <div
        className={`mb-12 md:mb-16 transition-transform duration-700 ${fadeOut ? '-translate-y-4' : 'translate-y-0'}`}
      >
        <h2 className="font-barlow text-[10px] md:text-[14px] tracking-[0.4em] text-champagne-dark uppercase font-medium text-center">
          {SEO_CONFIG.brandName}
        </h2>
      </div>

      {/* 2. SPINNER E CÂMERA (CENTRO) */}
      <div className="relative w-24 h-24 md:w-32 md:h-32">
        <div className="absolute inset-0 rounded-full border border-champagne-dark/10" />
        <div
          className="absolute inset-0 rounded-full border-t-[2px] border-r-[2px] border-transparent border-t-champagne-dark border-r-champagne-dark/30 animate-spin"
          style={{ animationDuration: '2s' }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-16 h-16 bg-champagne-dark/10 blur-[20px] rounded-full animate-pulse" />
            <Camera
              className="text-champagne-dark relative z-10 animate-pulse-gentle w-8 h-8 md:w-12 md:h-12"
              strokeWidth={1}
            />
          </div>
        </div>
      </div>

      {/* 3. MENSAGEM E PROGRESSO (BASE) */}
      <div
        className={`mt-12 md:mt-16 flex flex-col items-center gap-5 transition-transform duration-700 ${
          fadeOut ? 'translate-y-4' : 'translate-y-0'
        }`}
      >
        <p className="font-barlow text-[10px] md:text-[14px] tracking-[0.4em] text-champagne-dark uppercase font-medium text-center px-6">
          {message}
        </p>

        <div className="relative w-12 md:w-16 h-[1px] bg-gold-light/20 overflow-hidden">
          <div className="absolute inset-0 bg-champagne-dark animate-progress-line" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes progress-line {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-progress-line {
          animation: progress-line 2.5s infinite ease-in-out;
        }
        .animate-pulse-gentle {
          animation: pulse 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
