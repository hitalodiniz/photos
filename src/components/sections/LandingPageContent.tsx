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

        <main className="flex-grow flex items-center">
          <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-12 py-6 md:py-12">
            {/* LADO DIREITO (LOGIN) - AGORA PRIMEIRO NO MOBILE */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start justify-center order-1 lg:order-2">
              <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-6 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/10 blur-[80px] rounded-full" />

                <h2 className="text-white text-2xl md:text-3xl font-bold mb-4 tracking-tight text-center lg:text-left">
                  Comece agora
                </h2>
                <p className="text-white/80 text-sm md:text-base mb-8 text-center lg:text-left">
                  Conecte sua conta do Google de forma segura. Organizamos suas
                  galerias automaticamente.
                </p>

                <div className="flex flex-col gap-4 md:w-full items-center">
                  <GoogleSignInButton />
                  <p className="text-[9px] md:text-[10px] text-center text-white/80 uppercase tracking-widest">
                    Acesso 100% Seguro via Google Auth
                  </p>
                </div>
              </div>

              <div className="mt-4 px-4 text-center lg:text-left">
                <p className="text-[10px] text-center text-white/80 tracking-widest italic">
                  * Não armazenamos suas fotos. Atuamos como uma camada de
                  visualização inteligente.
                </p>
              </div>
            </div>

            {/* LADO ESQUERDO (FEATURES) - AGORA SEGUNDO NO MOBILE */}
            <div className="lg:col-span-7 flex flex-col justify-center order-2 lg:order-1">
              <div className="md:mb-6 lg:mb-2 text-center lg:text-left">
                <span className="text-[#D4AF37] text-[10px] md:text-[14px] tracking-[0.4em] uppercase font-black">
                  Por que nos escolher?
                </span>
              </div>
              <div className="h-full">
                <FeatureGrid items={features} columns={2} iconPosition="left" />
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
