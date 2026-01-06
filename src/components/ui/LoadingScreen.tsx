'use client';

import { Camera } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
  fadeOut?: boolean; // Nova prop para controlar o início da saída
}

export default function LoadingScreen({
  message = 'Verificando seu acesso',
  fadeOut = false,
}: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Lógica para esconder o componente após a animação de fade-out
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
      <div className="relative w-32 h-32 md:w-40 md:h-40">
        {/* Círculo de fundo estático */}
        {/* Usando champagne-dark para evitar o tom avermelhado */}
        <div className="absolute inset-0 rounded-full border border-champagne-dark/10" />

        {/* Spinner com a cor Champagne do seu global.css */}
        <div
          className="absolute inset-0 rounded-full border-t-[3px] border-r-[3px] border-transparent border-t-champagne-dark border-r-champagne-dark/30 animate-spin"
          style={{ animationDuration: '2s' }}
        />

        {/* Ícone de Câmera Centralizado e Ampliado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Brilho (Glow) pulsante mais intenso */}
            {/* Glow ajustado: menos opacidade para não "esquentar" a cor */}
            <div className="absolute w-24 h-24 bg-champagne-dark/10 blur-[30px] rounded-full animate-pulse" />
            <Camera
              size={48} // Aumentado de 36 para 56
              strokeWidth={0.75} // Linhas ultra-finas para estética Premium
              className="text-champagne-dark relative z-10 animate-pulse-gentle"
            />
          </div>
        </div>
      </div>

      {/* Texto com tipografia Barlow e animação de subida */}
      <div
        className={`mt-16 flex flex-col items-center gap-5 transition-transform duration-700 ${fadeOut ? 'translate-y-4' : 'translate-y-0'}`}
      >
        <p className="font-barlow text-[12px] md:text-[14px] tracking-[0.4em] text-champagne-dark uppercase font-medium text-center px-6">
          {' '}
          {message}
        </p>

        {/* Linha de progresso minimalista com gold-light */}
        <div className="relative w-16 h-[1px] bg-gold-light overflow-hidden">
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
