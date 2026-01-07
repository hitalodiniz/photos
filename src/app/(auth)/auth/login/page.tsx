'use client';

import { motion } from 'framer-motion';
import { GoogleSignInButton } from '@/components/auth';
import { ShieldCheck } from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import FeatureGrid from '@/components/ui/FeatureGrid';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('Acesso restrito');

  const loginItems = [
    {
      icon: <ShieldCheck />,
      title: 'Identificação Profissional',
      desc: (
        /* Alterado para items-center para garantir que tudo no desc centralize */
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-white/70 max-w-sm">
              Utilize sua conta Google para gerenciar suas galerias e conteúdos
              profissionais com segurança total.
            </p>
          </div>

          <GoogleSignInButton />

          <div className="pt-6 border-t border-white/5 w-full">
            <p className="text-[10px] md:text-[11px] text-white/70 uppercase tracking-[0.1em] leading-relaxed">
              Ambiente seguro • Criptografia ponta a ponta
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
          title="Acesso Restrito"
          subtitle={
            <>
              Bem-vindo de volta ao seu{' '}
              <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">
                espaço exclusivo
              </span>
            </>
          }
        />

        <main className="flex-grow flex flex-col items-center justify-center py-6 md:py-10">
          <div className="w-full max-w-2xl mx-auto">
            {/* Componente agora centraliza todo o fluxo de login em uma pílula sólida única */}
            <FeatureGrid items={loginItems} iconPosition="top" />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
