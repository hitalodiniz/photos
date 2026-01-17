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
import FeatureGrid from '@/components/ui/FeatureGrid';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function TermosDeUsoPage() {
  usePageTitle('Termos de Uso');

  const termosItems = [
    {
      icon: <UserCheck />,
      title: 'Aceitação dos Termos',
      desc: 'Ao utilizar esta plataforma, você concorda com estas diretrizes. O serviço é um visualizador de mídia otimizado para usuários que utilizam o Google Drive™ como servidor autor.',
    },
    {
      icon: <Globe />,
      title: 'Licença e Propriedade',
      desc: 'Você mantém 100% da propriedade intelectual de suas mídias. A disponibilidade das fotos depende exclusivamente da manutenção dos arquivos e permissões em sua conta Google pessoal.',
    },
    {
      icon: <ShieldCheck />,
      title: 'Segurança e Dados (LGPD)',
      desc: "Atuamos em conformidade com a LGPD. Não armazenamos fotos em nossos servidores. O usuário deve configurar a pasta no Drive como 'Qualquer pessoa com o link' para viabilizar a exibição.",
    },
    {
      icon: <ShieldAlert />,
      title: 'Limites de Uso e Planos',
      desc: 'O acesso a recursos avançados como Analytics e Vídeos é determinado pelo plano contratado. O uso indevido para fins ilegais resultará em suspensão imediata da conta.',
    },

    {
      icon: <UserCheck />, // Mantém o estilo dos ícones de 40px no tom Champanhe
      title: 'Responsabilidade do Usuário',
      desc: 'O usuário é o único responsável pelo conteúdo veiculado e pela gestão das chaves de acesso. A plataforma atua como ferramenta de exibição, cabendo ao usuário garantir que o uso do serviço e a divulgação das mídias respeitem os direitos de imagem e os acordos firmados com seus clientes finais.',
    },

    {
      icon: <FileText />,
      title: 'Modificações no Serviço',
      desc: 'Reservamos o direito de ajustar termos para refletir melhorias técnicas ou mudanças legais, sempre visando a estabilidade e segurança da sua galeria autor.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#000]">
      {/* BACKGROUND DINÂMICO PADRONIZADO */}
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Termos de Uso"
          subtitle={
            <>
              Regras e diretrizes para uma{' '}
              <span className="font-semibold border-b-2 border-[#F3E5AB]/50 text-white">
                experiência autor
              </span>
            </>
          }
        />

        {/* Aplicação do FeatureGrid com as configurações de mobile/desktop ajustadas */}
        <FeatureGrid items={termosItems} iconPosition="top" />

        <Footer />
      </div>
    </div>
  );
}
