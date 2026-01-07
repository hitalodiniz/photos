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
import { sendAppErrorLogAction } from '@/actions/email.actions'; // Importando a nova action

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
    // Dispara o log de erro para seu e-mail automaticamente ao carregar a página
    const reportError = async () => {
      await sendAppErrorLogAction(error, 'GlobalError Boundary');
    };

    reportError();
    console.error('Erro capturado pelo Boundary:', error);
  }, [error]);

  const errorItems = [
    {
      icon: <AlertTriangle />,
      title: 'Instabilidade Técnica',
      desc: (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-white/70 text-[12px] md:text-[14px] leading-relaxed max-w-sm">
              Ocorreu uma falha inesperada. Nossa equipe de monitoramento já
              recebeu um relatório detalhado e está trabalhando na solução.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
            <button
              onClick={() => reset()}
              className="px-8 py-3 bg-[#D4AF37] hover:bg-[#B8860B] text-black font-black uppercase tracking-widest text-[10px] rounded-full transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw size={14} /> Tentar Novamente
            </button>

            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-full border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Home size={14} /> Início
            </button>
          </div>

          <div className="pt-6 border-t border-white/5 w-full">
            <p className="text-[9px] text-white/20 uppercase tracking-[0.2em]">
              ID do Erro: ${error.digest || 'N/A'} • Relatório enviado com
              sucesso
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      <DynamicHeroBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Erro de Sistema"
          subtitle={
            <>
              Falha crítica no{' '}
              <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">
                processamento de dados
              </span>
            </>
          }
        />

        <main className="flex-grow flex flex-col items-center justify-center py-6 md:py-10">
          <div className="w-full max-w-2xl mx-auto px-4">
            {/* Ícone centralizado no topo com 32px no mobile conforme padronizado */}
            <FeatureGrid items={errorItems} iconPosition="top" />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
