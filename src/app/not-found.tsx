'use client';
import { Home, LogIn, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import { FeatureItem } from '@/components/ui';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

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

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND FIXO PADRONIZADO */}
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Erro 404"
          subtitle={
            <>
              Conteúdo não encontrado ou{' '}
              <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">
                galeria indisponível
              </span>
            </>
          }
        />

        <main className="flex-grow flex items-center justify-center py-10 px-4">
          <section
            className="w-full max-w-5xl mx-auto bg-white/95 backdrop-blur-xl 
          rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl border border-white/50 text-center md:text-left"
          >
            <div className="grid grid-cols-1 gap-y-2 px-2 md:px-6">
              <div className="flex flex-col items-center md:items-start text-center md:text-left mb-4">
                <p className="text-[11px] text-black/40 uppercase tracking-[0.2em] font-black">
                  Redirecionando você em {countdown} segundos...
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureItem
                  /* COR CHAMPANHE NOS ÍCONES */
                  icon={<Home size={30} />}
                  title="Página Inicial"
                  desc="Clique aqui para retornar à vitrine principal e explorar outras galerias profissionais disponíveis."
                  onClick={() => router.push('/')}
                />

                <FeatureItem
                  icon={<Globe size={30} />}
                  title="Link Incorreto"
                  desc="Verifique se a URL digitada está correta ou entre em contato com o fotógrafo responsável pelo evento."
                />
              </div>

              {/* BOTÕES PADRONIZADOS */}
              <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row gap-4 justify-center md:justify-start">
                <button
                  onClick={() => router.push('/')}
                  className="btn-primary"
                >
                  <Home size={16} /> Voltar
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-primary"
                >
                  <LogIn size={16} /> Espaço fotógrafo
                </button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
