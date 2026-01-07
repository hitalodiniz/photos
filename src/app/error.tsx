'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import FeatureGrid from '@/components/ui/FeatureGrid';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  usePageTitle('Erro interno');
  const router = useRouter();

  useEffect(() => {
    if (error.message === 'AUTH_RECONNECT_REQUIRED') {
      router.push('/auth/reconnect');
    }
    console.error('Erro capturado pelo Boundary:', error);
  }, [error, router]);

  const errorItems = [
    {
      icon: <RefreshCcw />,
      title: 'Tentar Novamente',
      desc: (
        <div className="flex flex-col gap-4">
          <p>
            Clique abaixo para recarregar os componentes e processar sua
            solicitação novamente.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="w-fit px-6 py-2.5 bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black uppercase tracking-widest text-[10px] rounded-full transition-all"
          >
            Tentar novamente{' '}
          </button>
        </div>
      ),
    },
    {
      icon: <AlertTriangle />,
      title: 'Erro Técnico',
      desc: (
        <div className="flex flex-col gap-4">
          <p>
            Ocorreu uma instabilidade interna. Nossa equipe já foi notificada.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/');
            }}
            className="w-fit px-6 py-2.5 bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black uppercase tracking-widest text-[10px] rounded-full transition-all"
          >
            Voltar ao Início
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Erro interno"
          subtitle={
            <>
              Identificamos uma falha no processamento ou{' '}
              <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">
                instabilidade técnica
              </span>
            </>
          }
        />

        <FeatureGrid items={errorItems} iconPosition="top" />

        <Footer />
      </div>
    </div>
  );
}
