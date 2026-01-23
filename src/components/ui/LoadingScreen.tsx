'use client';

import { useEffect, useState } from 'react';
import { SEO_CONFIG } from '@/core/config/seo.config';
import LoadingSpinner from './LoadingSpinner';
import { div } from 'framer-motion/client';

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
  className={`${containerClasses} flex flex-col items-center justify-center transition-all duration-1000 bg-[#1A2627] ${
    fadeOut ? 'opacity-0 scale-[1.01] pointer-events-none' : 'opacity-100'
  }`}
>
  {/* 🌊 O Truque da Navbar: Gradiente que "funde" com o topo */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-petroleum/10 via-transparent to-black/20 pointer-events-none" />

  <div className="relative z-10 flex flex-col items-center">
    {/* 🎯 Branding - Em Champagne Suave */}
    <div className={`mb-12 transition-transform duration-1000 ${fadeOut ? '-translate-y-4' : 'translate-y-0'}`}>
      <h2 className="text-[10px] font-medium uppercase tracking-[0.4em] text-[#F3E5AB]/90 text-center">
        {SEO_CONFIG.brandName}
      </h2>
    </div>

    {/* 🎯 Spinner Central */}
    <div className="relative flex items-center justify-center">
      <LoadingSpinner size="md" />
    </div>

    {/* 🎯 Mensagem */}
    <div className={`mt-12 flex flex-col items-center gap-8 transition-transform duration-1000 ${fadeOut ? 'translate-y-4' : 'translate-y-0'}`}>
      <p className="text-[10px] font-light uppercase tracking-[0.25em] text-[#F3E5AB]/90 text-center px-8 italic">
        {message}
      </p>
      
      {/* Progresso Minimalista */}
      <div className="relative w-20 h-[1px] bg-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gold/90 animate-progress-line" />
      </div>
    </div>
  </div>
</div>
  );
}