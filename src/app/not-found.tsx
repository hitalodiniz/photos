'use client';

import { Home, LogIn, Globe, ArrowRight, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/layout';
import EditorialView from '@/components/layout/EditorialView';
import EditorialCard from '@/components/ui/EditorialCard';
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

  return (
    <EditorialView
      title="Erro 404"
      subtitle={
        <>
          Conteúdo não encontrado ou{' '}
          <span className="font-semibold text-white italic">
            galeria indisponível
          </span>
        </>
      }
    >
      {/* 🎯 SEÇÃO BRANCA DE CONTEÚDO */}
      <section className="w-full bg-white py-10 shadow-sm border-y border-slate-100">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          {/* CABEÇALHO CENTRALIZADO */}
          <div className="text-left mb-14">
            <p className="text-gold text-xs uppercase tracking-[0.3em] font-semibold mb-6">
              Perdido no Espaço Editorial?
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-petroleum italic mb-8">
              Parece que este caminho não existe mais
            </h2>

            <div className="flex items-center justify-center gap-3 bg-petroleum border border-white/10 px-6 py-3 rounded-full w-fit mx-auto shadow-xl">
              <Timer size={16} className="text-gold animate-pulse" />
              <p className="text-[10px] text-white uppercase tracking-widest font-bold whitespace-nowrap">
                Redirecionamento automático em{' '}
                <span className="text-gold">{countdown}s</span>
              </p>
            </div>
          </div>

          {/* GRID UTILIZANDO EDITORIALCARD PARA PADRONIZAÇÃO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10">
            {/* Opção 1: Home */}
            <EditorialCard
              title="Página Inicial"
              accentColor="#B8860B"
              icon={<Home size={32} strokeWidth={1.5} />}
              items={[
                'Retorne à vitrine principal',
                'Explore novas galerias profissionais',
                'Acesse o portal comercial',
              ]}
            >
              <button
                onClick={() => router.push('/')}
                className="mt-auto w-full py-4 bg-petroleum text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                Voltar Agora <ArrowRight size={14} />
              </button>
            </EditorialCard>

            {/* Opção 2: Área do Usuário */}
            <EditorialCard
              title="Área do Usuário"
              accentColor="#1a363d"
              icon={<Globe size={32} strokeWidth={1.5} />}
              items={[
                'Verifique a URL digitada',
                'Acesse seu painel administrativo',
                'Gerencie suas fotos e clientes',
              ]}
            >
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-auto w-full py-4 bg-white border border-petroleum/20 text-petroleum rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:border-petroleum transition-all"
              >
                <LogIn size={14} /> Acessar Painel
              </button>
            </EditorialCard>
          </div>
        </div>
      </section>

      <Footer />
    </EditorialView>
  );
}
