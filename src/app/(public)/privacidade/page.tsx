'use client';

import { ShieldCheck, Database, Share2, Lock } from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import { FeatureGrid } from '@/components/ui'; // Importando o novo componente
import { usePageTitle } from '@/hooks/usePageTitle';

export default function PrivacidadePage() {
  usePageTitle('Privacidade e Transparência');

  const privacidadeItems = [
    {
      icon: <Share2 />,
      title: 'Uso de Dados do Google Drive™',
      desc: "Nossa plataforma utiliza o escopo 'drive.readonly' estritamente para listar arquivos e gerar miniaturas de visualização. Não realizamos alterações, edições ou exclusões em seus arquivos originais.",
    },
    {
      icon: <Database />,
      title: 'Sua Propriedade Intelectual',
      desc: 'Não realizamos o download, cópia ou armazenamento permanente de suas fotos. Atuamos como um espelhamento dinâmico: as imagens permanecem hospedadas no seu Google Drive™.',
    },
    {
      icon: <Lock />,
      title: 'Segurança do Cliente Final',
      desc: 'Implementamos autenticação via senha protegida por cookies técnicos que servem apenas para validar o acesso e expiram automaticamente em 24 horas.',
    },
    {
      icon: <ShieldCheck />,
      title: 'Conformidade com a LGPD',
      desc: 'Garantimos que nenhum dado pessoal ou biométrico contido nas fotos é coletado ou processado, em total conformidade com a Lei Geral de Proteção de Dados.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      {/* BACKGROUND DINÂMICO PADRONIZADO */}
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Privacidade e Transparência"
          subtitle={
            <>
              Compromisso com a{' '}
              <span className="font-semibold border-b-2 border-champagne/50 text-white">
                segurança dos seus dados
              </span>
            </>
          }
        />

        {/* CONTEÚDO UTILIZANDO O COMPONENTE REUTILIZÁVEL */}
        <FeatureGrid items={privacidadeItems} iconPosition="top" />
        {/* RODAPÉ - flex-none fixo na base */}
        <Footer />
      </div>
    </div>
  );
}
