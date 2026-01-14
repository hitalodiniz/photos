'use client';

import { RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth';
import { useRouter } from 'next/navigation';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import FeatureGrid from '@/components/ui/FeatureGrid';
import { usePageTitle } from '@/hooks/usePageTitle';
import { div } from 'framer-motion/client';

export default function ReconnectPage() {
  usePageTitle('Restaurar Conexão');

  const reconnectItems = [
    {
      icon: <RefreshCw className="animate-spin-slow" />,
      title: 'Conexão Expirada',
      desc: (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-white/70 text-[13px] md:text-[14px] leading-relaxed max-w-sm">
              Para sua proteção, o vínculo com o <strong>Google Drive™</strong>{' '}
              deve ser reestabelecido. Valide sua identidade para continuar
              gerenciando seu perfil.
            </p>
          </div>

          <GoogleSignInButton />
        </div>
      ),
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Segurança"
          subtitle={
            <>
              Sua chave de acesso{' '}
              <span className="font-semibold border-b-2 border-[#F3E5AB]/50 text-white">
                precisa ser renovada
              </span>
            </>
          }
        />

        <main className="flex-grow flex flex-col items-center justify-center py-6 md:py-10">
          <div className="w-full max-w-2xl mx-auto px-4">
            {/* FeatureGrid configurado para centralização total no topo */}
            <FeatureGrid items={reconnectItems} iconPosition="top" />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
