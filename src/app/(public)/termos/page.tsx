'use client';
import {
  FileText,
  Globe,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import { FeatureItem } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function TermosDeUsoPage() {
  usePageTitle('Termos de Uso');

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND FIXO PADRONIZADO */}
      <DynamicHeroBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Termos de Uso"
          subtitle={
            <>
              Regras e diretrizes para uma{' '}
              <span className="font-bold border-b-2 border-[#F3E5AB]/50 text-white">
                experiência profissional
              </span>
            </>
          }
        />
        {/* CONTEÚDO NO CONTAINER BRANCO PADRONIZADO */}
        <main className="flex-grow flex items-center justify-center py-10">
          <section
            className="w-full max-w-5xl mx-auto bg-white/90 backdrop-blur-xl 
    rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl border border-white/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-1 gap-y-6 px-2 md:px-6">
              <FeatureItem
                icon={<UserCheck size={30} />}
                title="Aceitação dos Termos"
                desc="Ao utilizar esta plataforma, você concorda com estas diretrizes. O serviço é um visualizador de mídia otimizado para fotógrafos que utilizam o Google Drive™ como servidor de armazenamento de fotos e vídeos."
              />

              <FeatureItem
                icon={<Globe size={30} />}
                title="Licença e Propriedade"
                desc="Você mantém 100% da propriedade intelectual de suas mídias. Concedemos uma licença de uso da nossa interface. A disponibilidade das fotos depende exclusivamente da manutenção dos arquivos e permissões em sua conta Google pessoal."
              />

              <FeatureItem
                icon={<ShieldCheck size={30} />}
                title="Segurança e Dados (LGPD)"
                desc="Atuamos em conformidade com a Lei Geral de Proteção de Dados (LGPD). Não armazenamos suas fotos em nossos servidores. O usuário é responsável por configurar a pasta no Google Drive™ como 'Qualquer pessoa com o link' para viabilizar a exibição."
              />

              <FeatureItem
                icon={<ShieldAlert size={30} />}
                title="Limites de Uso e Planos"
                desc="O acesso a recursos como Analytics, Perfil Profissional e vídeos é determinado pelo plano contratado (Start, Intermediate, Pro ou Premium). O uso indevido para fins ilegais resultará em suspensão imediata."
              />

              <FeatureItem
                icon={<FileText size={30} />}
                title="Modificações no Serviço"
                desc="Reservamos o direito de atualizar funcionalidades ou ajustar termos para refletir melhorias técnicas ou mudanças legais, sempre visando a estabilidade e segurança da sua galeria profissional."
              />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
