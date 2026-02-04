'use client';

import React from 'react';
import { 
  ShieldCheck,
  Database,
  Share2,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import EditorialView from '@/components/layout/EditorialView';
import EditorialCard from '@/components/ui/EditorialCard';

export default function PRIVACIDADEPage() {
  const privacidadeCards = [
    {
      title: 'Google Drive™',
      accent: '#B8860B', // Ouro Escuro
      icon: <Share2 size={32} strokeWidth={1.5} />,
      items: [
        'Uso estrito do escopo de leitura (readonly)',
        'Espelhamento dinâmlico sem alteração de arquivos',
        'Sem acesso para exclusão ou modificação',
      ],
    },
    {
      title: 'Propriedade',
      accent: '#1a363d', // Petroleum
      icon: <Database size={32} strokeWidth={1.5} />,
      items: [
        'Suas fotos permanecem sob seu controle absoluto',
        'Não realizamos cópia ou armazenamento permanente',
        'Imagens permanecem no seu próprio Drive',
      ],
    },
    {
      title: 'Acesso Técnico',
      accent: '#B8860B',
      icon: <Lock size={32} strokeWidth={1.5} />,
      items: [
        'Autenticação robusta via Google Auth',
        'Cookies de sessão com expiração automática',
        'Dados de login sempre criptografados',
      ],
    },
  ];

  const editorialContent = (
    <>
      {/* GRID DE CARDS DE PRIVACIDADE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {privacidadeCards.map((card, idx) => (
          <EditorialCard
            key={idx}
            title={card.title}
            items={card.items}
            icon={card.icon}
            accentColor={card.accent}
          />
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 bg-petroleum border border-white/10 px-6 py-3 rounded-full backdrop-blur-xl w-fit mx-auto mt-10">
        <ShieldCheck size={20} className="text-gold" />
        <span className="text-[10px] font-semibold uppercase tracking-luxury-widest text-white whitespace-nowrap">
          Conformidade com a Lei Geral de Proteção de Dados • 2026
        </span>
      </div>
    </>
  );

  return (
    <EditorialView
      title="Privacidade"
      subtitle={
        <>
          Compromisso com a{' '}
          <span className="font-semibold text-white italic">
            segurança e transparência
          </span>
        </>
      }
      sectionTitle="Segurança em Primeiro Lugar"
      sectionSubtitle="Como protegemos sua autoria e seus dados?"
      sectionDescription="Nossa operação é desenhada para ser transparente. Nenhum dado pessoal ou biométrico contido nas fotos é processado por nossos servidores."
    >
      {editorialContent}
    </EditorialView>
  );
}
