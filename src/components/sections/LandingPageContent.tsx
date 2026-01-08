'use client';
import { GoogleSignInButton } from '@/components/auth';
import FeatureGrid from '@/components/ui/FeatureGrid';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import {
  Zap,
  Smartphone,
  Camera,
  Infinity,
  Cloud,
  CloudSun,
} from 'lucide-react';

export default function LandingPageContent() {
  const features = [
    {
      icon: <Cloud />,
      title: 'Cloud Power',
      desc: 'Use o Drive que você já possui.',
    },
    {
      icon: <Zap />,
      title: 'Instantânea',
      desc: 'Subiu no Drive, está na galeria.',
    },
    {
      icon: <Smartphone />,
      title: 'Mobile First',
      desc: 'Otimizado para smartphones.',
    },
    { icon: <Infinity />, title: 'Ilimitadas', desc: 'Sem limites de upload.' },
    {
      icon: <Camera />,
      title: 'Ultra HD',
      desc: 'Preservação da resolução original.',
    },
    {
      icon: <CloudSun />,
      title: 'Segurança',
      desc: 'Suas fotos sempre acessíveis.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-x-hidden bg-[#000]">
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Centralizado no Topo */}
        <EditorialHeader
          title="Sua Galeria de Fotos"
          subtitle={
            <>
              Transformando o Google Drive™ em uma{' '}
              <span className="font-bold border-b-2 border-[#34A853] text-white">
                Galeria Profissional
              </span>
            </>
          }
          showBackButton={false}
        />

        {/* SEÇÃO PRINCIPAL - DIVIDIDA EM DUAS COLUNAS */}
        <main className="flex-grow flex items-center">
          <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 py-12">
            {/* LADO ESQUERDO: Features (Ocupa 7 colunas) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="mb-2 hidden lg:block">
                <span className="text-[#D4AF37] text-[10px] text-[14px] tracking-[0.4em] uppercase font-black">
                  Por que nos escolher?
                </span>
              </div>
              <div className="h-full">
                <FeatureGrid items={features} columns={2} iconPosition="left" />
              </div>
            </div>

            {/* LADO DIREITO: Login e Texto Curto (Ocupa 5 colunas) */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start justify-center">
              <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                {/* Efeito de Glow atrás do Login */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/10 blur-[80px] rounded-full" />

                <h2 className="text-white text-2xl md:text-3xl font-bold mb-4 tracking-tight">
                  Comece agora
                </h2>
                <p className="text-white/80 text-sm md:text-base mb-8">
                  Conecte sua conta do Google de forma segura. Organizamos suas
                  galerias de fotos automaticamente sem ocupar espaço extra no
                  seu Google Drive™.
                </p>

                <div className="flex flex-col gap-4 w-full">
                  <GoogleSignInButton />
                  <p className="text-[10px] text-center text-white/80 uppercase tracking-widest">
                    Acesso 100% Seguro via Google Auth
                  </p>
                </div>
              </div>

              {/* Texto de rodapé da caixa de login */}
              <div className="mt-6 px-4 text-center lg:text-left">
                <p className="text-white/70 text-[12px] italic">
                  * Não armazenamos suas fotos. Atuamos como uma camada de
                  visualização inteligente sobre seu armazenamento original.
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
