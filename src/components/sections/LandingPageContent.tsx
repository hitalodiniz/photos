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
      desc: 'Use o armazenamento que você já possui.',
    },
    {
      icon: <Zap />,
      title: 'Entrega Instantânea',
      desc: 'Subiu no Drive, está na galeria.',
    },
    {
      icon: <Smartphone />,
      title: 'Foco em Mobile',
      desc: 'Galerias otimizadas para smartphones.',
    },
    {
      icon: <Infinity />,
      title: 'Fotos Ilimitadas',
      desc: 'Sem limites de upload ou cobranças.',
    },
    {
      icon: <Camera />,
      title: 'Qualidade Ultra HD',
      desc: 'Preservação total da resolução original.',
    },
    {
      icon: <CloudSun />,
      title: 'Nuvem',
      desc: 'Suas fotos seguras e acessíveis sempre.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND FIXO - Gradiente padronizado */}
      <DynamicHeroBackground />

      {/* CONTEÚDO FLUIDO - Flex-col para permitir o crescimento do Main */}
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
        <div className="flex flex-col items-center justify-center w-full pt-6 pb-0 md:pt-10 transition-transform hover:scale-105">
          <GoogleSignInButton />
        </div>
        {/* SEÇÃO DE FEATURES - flex-grow centraliza a section entre o header e footer */}
        <FeatureGrid items={features} columns={3} iconPosition="top" />{' '}
        {/* RODAPÉ - flex-none fixo na base */}
        <Footer />
      </div>
    </div>
  );
}
