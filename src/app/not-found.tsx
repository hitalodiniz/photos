'use client';

import { Home, LogIn, Globe, ArrowRight, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import FeatureGrid from '@/components/ui/FeatureGrid';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  usePageTitle('Página não encontrada');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    const redirect = setTimeout(() => {
      router.push('/');
    }, 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [router]);

  const notFoundItems = [
    {
      icon: <Home />,
      title: 'Página Inicial',
      desc: (
        /* items-center e text-center para centralização total */
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-white/90 max-w-xs">
            Retorne à vitrine principal para explorar outras galerias
            profissionais disponíveis.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-fit px-8 py-3 bg-gold hover:bg-gold/90 text-black font-semibold uppercase tracking-luxury-widest text-[10px] rounded-full transition-all flex items-center gap-2 shadow-lg shadow-gold/10"
          >
            Voltar Agora <ArrowRight size={12} />
          </button>
        </div>
      ),
    },
    {
      icon: <Globe />,
      title: 'Link Incorreto',
      desc: (
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-white/90 max-w-xs">
            Verifique a URL ou acesse o ambiente restrito se você for o
            administrador.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-fit px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold uppercase tracking-luxury-widest text-[10px] rounded-full border border-white/10 transition-all flex items-center gap-2"
          >
            <LogIn size={12} /> Área do usuário
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Erro 404"
          subtitle={
            <>
              Conteúdo não encontrado ou{' '}
              <span className="font-semibold border-b-2 border-champagne/50 text-white">
                galeria indisponível
              </span>
            </>
          }
        />

        <main className="flex-grow flex flex-col items-center justify-center py-6 md:py-10">
          {/* CONTADOR COM FUNDO ESTILIZADO */}
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
              <Timer size={14} className="text-gold animate-pulse" />
              <p className="text-[10px] md:text-xs text-white/90 uppercase tracking-luxury-widest font-semibold">
                Redirecionando em{' '}
                <span className="text-gold">{countdown}s</span>
              </p>
            </div>
          </div>

          <div className="w-full">
            <FeatureGrid items={notFoundItems} iconPosition="top" />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
