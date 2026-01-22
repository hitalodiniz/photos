'use client';

// Como usar: if (loading) return <LoadingScreen message="Buscando fotos..." />;

import { Camera } from 'lucide-react';
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
    // Quando o componente monta, garantimos que o body ainda não tem a classe se não for fadeOut
    if (!fadeOut) {
      document.body.classList.remove('js-ready');
    }

    if (fadeOut) {
      // 1. Libera o conteúdo do fundo para começar o fade-in dele
      document.body.classList.add('js-ready');

      // 2. Inicia o timer para remover o LoadingScreen da DOM após a animação
      const timer = setTimeout(() => setIsVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [fadeOut]);

  if (!isVisible) return null;

  const containerClasses = type === 'full' 
    ? 'fixed inset-0 z-[9999]' 
    : 'fixed top-[65px] inset-x-0 bottom-0 z-[95]';

  return (
    <div
      className={`${containerClasses} flex flex-col items-center justify-center bg-petroleum dark:bg-black transition-opacity duration-500 ease-in-out ${
        fadeOut ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className={`mb-12 md:mb-16 transition-transform duration-700 ${fadeOut ? '-translate-y-4' : 'translate-y-0'}`}
      >
        <h2 className="text-editorial-label text-gold text-center transition-colors duration-300">
          {SEO_CONFIG.brandName}
        </h2>
      </div>

      <LoadingSpinner size="md" />

      <div
        className={`mt-12 md:mt-16 flex flex-col items-center gap-5 transition-transform duration-700 ${fadeOut ? 'translate-y-4' : 'translate-y-0'}`}
      >
        <p className="text-editorial-label text-gold text-center px-6 transition-colors duration-300">
          {message}
        </p>
        <div className="relative w-12 md:w-16 h-[1px] bg-white/10 overflow-hidden transition-colors duration-300">
          <div className="absolute inset-0 bg-gold animate-progress-line transition-colors duration-300" />
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
