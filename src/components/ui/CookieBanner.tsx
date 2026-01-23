'use client';
import React, { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';
import Link from 'next/link';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Usamos requestAnimationFrame para agendar a exibição
      // para o próximo frame de pintura do navegador.
      // Isso remove a sincronia que o ESLint condena.
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[2000] flex justify-center animate-in slide-in-from-bottom-10 duration-700">
      <div className="bg-[#2D2E30]/95 backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-left">
          <div className="bg-[#D4AF37]/20 p-3 rounded-full hidden sm:block">
            <Cookie className="text-[#D4AF37] w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-white font-semibold text-lg">
              Privacidade e Experiência
            </h4>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
              Utilizamos cookies para otimizar sua visualização e garantir a
              segurança do seu acesso à galeria. Ao continuar, você concorda com
              nossa{' '}
              <Link
                href="/privacidade"
                className="text-[#D4AF37] hover:text-[#F3E5AB] underline underline-offset-4 transition-colors font-medium"
              >
                política de privacidade
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsVisible(false)}
            className="flex-1 md:flex-none text-gray-400 hover:text-white text-xs font-medium px-4 py-2 transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={acceptCookies}
            className="flex-1 md:flex-none bg-champagne text-petroleum text-xs font-semibold uppercase tracking-widest px-8 py-3 rounded-xl transition-all shadow-lg active:scale-95"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
