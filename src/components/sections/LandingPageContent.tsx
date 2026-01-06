'use client';
import { GoogleSignInButton } from '@/components/auth';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import {
  Zap,
  Smartphone,
  Camera,
  CloudUpload,
  Infinity,
  Cloud,
} from 'lucide-react';
import { FeatureItem } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function LandingPageContent() {
  usePageTitle('');
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
        <main className="flex-grow flex items-center justify-center px-6 py-4 md:px-4 md:py-8">
          <section className="w-full max-w-[92%] sm:max-w-5xl mx-auto bg-white/90 rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-10 shadow-2xl border border-white/50">
            {/* Simetria lateral: justify-items-center e px equilibrado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 md:gap-y-8 gap-x-6 md:gap-x-12 lg:gap-x-20 justify-items-center">
              <FeatureItem
                icon={<Cloud size={30} />}
                title="Cloud Power"
                desc="Use o armazenamento que você já possui no Google Drive™"
              />
              <FeatureItem
                icon={<Zap size={30} className="fill-[#D4AF37]/20" />}
                title="Entrega Instantânea"
                desc="Subiu no Google Drive™, está na galeria. Simples assim"
              />
              <FeatureItem
                icon={<Smartphone size={30} />}
                title="Foco em Mobile"
                desc="Galerias otimizadas para WhatsApp e smartphones"
              />
              <FeatureItem
                icon={<Infinity size={30} />}
                title="Fotos Ilimitadas"
                desc="Sem limites de upload ou cobranças por download"
              />
              <FeatureItem
                icon={<Camera size={30} />}
                title="Qualidade Ultra HD"
                desc="Preservação total da resolução original das fotos"
              />
              <FeatureItem
                icon={<CloudUpload size={30} />}
                title="Nuvem Vitalícia"
                desc="Suas fotógrafias seguras e acessíveis para sempre"
              />
            </div>
          </section>
        </main>

        {/* RODAPÉ - flex-none fixo na base */}
        <Footer />
      </div>
    </div>
  );
}
