'use client';

import { ShieldCheck, Database, Share2, Lock, Users } from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import { FeatureGrid } from '@/components/ui';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function PrivacidadePage() {
  usePageTitle('Privacidade e Transparência');

  const privacidadeItems = [
    {
      icon: <Share2 className="text-gold" />,
      title: 'Uso de Dados do Google Drive™',
      desc: "Nossa plataforma utiliza o escopo 'drive.readonly' estritamente para listar arquivos e gerar miniaturas de visualização. Não realizamos alterações, edições ou exclusões em seus arquivos originais.",
    },
    {
      icon: <Database className="text-gold" />,
      title: 'Sua Propriedade Intelectual',
      desc: 'Não realizamos o download, cópia ou armazenamento permanente de suas fotos. Atuamos como um espelhamento dinâmico: as imagens permanecem hospedadas no seu Google Drive™.',
    },
    {
      icon: <Users className="text-gold" />, // 🎯 Novo item para abranger a captura de leads
      title: 'Cadastro de Visitantes e Identificação',
      desc: 'A coleta de dados de visitantes é uma opção exclusiva do organizador da galeria. O Sua Galeria atua apenas como processador desses dados para fins de identificação e entrega ao dono da galeria, sem utilizá-los para fins próprios ou marketing de terceiros.',
    },
    {
      icon: <Lock className="text-gold" />,
      title: 'Segurança do Cliente Final',
      desc: 'Implementamos autenticação via senha protegida por cookies técnicos que servem apenas para validar o acesso e expiram automaticamente em 24 horas.',
    },
    {
      icon: <ShieldCheck className="text-gold" />,
      title: 'Conformidade com a LGPD',
      desc: 'Garantimos que o tratamento de dados pessoais segue rigorosamente a Lei Geral de Proteção de Dados, assegurando a transparência entre o organizador (controlador) e o visitante (titular).',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
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

        {/* Padding superior para não grudar no header */}
        <div className="pt-8">
          <FeatureGrid items={privacidadeItems} iconPosition="top" />
        </div>

        <Footer />
      </div>
    </div>
  );
}