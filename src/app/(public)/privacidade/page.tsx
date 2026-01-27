'use client';

import { ShieldCheck, Database, Share2, Lock } from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import { usePageTitle } from '@/hooks/usePageTitle';
import EditorialCard from '@/components/ui/EditorialCard';

export default function PrivacidadePage() {
  usePageTitle('Privacidade e Transparência');

  const privacidadeItems = [
    {
      icon: <Share2 />,
      title: 'Dados do Google Drive™',
      summary: 'Uso estrito do escopo de leitura para espelhamento de mídia.',
      desc: "Nossa plataforma utiliza o acesso 'drive.readonly' exclusivamente para listar arquivos e gerar miniaturas. Não realizamos alterações, edições ou exclusões em seus arquivos originais.",
    },
    {
      icon: <Database />,
      title: 'Propriedade Intelectual',
      summary: 'Suas fotos permanecem sob seu controle total e absoluto.',
      desc: 'Não realizamos o download, cópia ou armazenamento permanente de suas mídias. Atuamos como um espelhamento dinâmico: as imagens permanecem hospedadas com segurança no seu próprio Drive.',
    },
    {
      icon: <Lock />,
      title: 'Segurança do Cliente',
      summary: 'Autenticação técnica robusta para proteção de acesso.',
      desc: 'Implementamos autenticação via senha protegida por cookies técnicos de sessão. Estes servem apenas para validar o acesso à galeria e expiram automaticamente em 24 horas.',
      badge: 'Protegido',
      isHighlight: true,
    },
    {
      icon: <ShieldCheck />,
      title: 'Conformidade LGPD',
      summary: 'Respeito integral à Lei Geral de Proteção de Dados.',
      desc: 'Garantimos que nenhum dado pessoal ou biométrico contido nas fotos é coletado ou processado. Nossa operação é desenhada para ser transparente e segura para você e seus clientes.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black font-montserrat">
      {/* BACKGROUND DINÂMICO PADRONIZADO */}
      <DynamicHeroBackground />

      {/* OVERLAY DE PROTEÇÃO EDITORIAL */}
      <div className="fixed inset-0 z-0 from-petroleum/40 via-petroleum/95 to-petroleum z-[1]" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Privacidade e Transparência"
          subtitle={
            <>
              Compromisso com a{' '}
              <span className="font-semibold border-b border-gold/50 text-white italic">
                segurança dos seus dados
              </span>
            </>
          }
        />

        <main className="flex-grow py-12 px-6 max-w-[1600px] mx-auto w-full">
          {/* GRID UTILIZANDO O EDITORIAL CARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-10 max-w-5xl mx-auto">
            {privacidadeItems.map((item, index) => (
              <EditorialCard
                key={index}
                title={item.title}
                icon={item.icon}
                badge={item.badge}
                isHighlighted={item.isHighlight}
              >
                {/* Estrutura interna otimizada para leitura */}
                <p className="text-[14px] leading-relaxed text-petroleum/80 font-semibold italic mb-4">
                  {item.summary}
                </p>

                <p className="text-[13px] leading-relaxed text-petroleum/70 font-medium">
                  {item.desc}
                </p>

                <div className="mt-auto pt-4 flex justify-center">
                  <div className="w-8 h-0.5 bg-gold/20" />
                </div>
              </EditorialCard>
            ))}
          </div>

          {/* SELO DE PROTOCOLO ATIVO */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-4 rounded-luxury backdrop-blur-sm">
              <ShieldCheck size={18} className="text-gold" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
                Atualizada em janeiro de 2026
              </span>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
