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

export default function PrivacidadePage() {
  const privacidadeCards = [
    {
      title: 'Google Drive™',
      accent: '#B8860B', // Ouro Escuro
      icon: <Share2 size={32} strokeWidth={1.5} />,
      items: [
        'Uso estrito do escopo de leitura (readonly)',
        'Espelhamento dinâmico sem alteração de arquivos',
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
    >
      {/* SEÇÃO BRANCA LARGURA TOTAL */}
      <section className="w-full bg-white py-10 shadow-sm border-y border-slate-100">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          {/* CABEÇALHO CENTRALIZADO */}
          <div className="text-left mb-14">
            <p className="text-gold text-xs uppercase tracking-[0.2em] font-semibold mb-3">
              Segurança em Primeiro Lugar
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-petroleum italic mb-4">
              Como protegemos sua autoria e seus dados?
            </h2>
            <p className="text-slate-600 text-sm md:text-base max-w-full font-medium">
              Nossa operação é desenhada para ser transparente. Nenhum dado
              pessoal ou biométrico contido nas fotos é processado por nossos
              servidores.
            </p>
          </div>

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
        </div>
        <div className="flex items-center justify-center gap-3 bg-petroleum border border-white/10 px-6 py-3 rounded-full backdrop-blur-xl w-fit mx-auto mt-10">
          <ShieldCheck size={20} className="text-gold" />
          <span className="text-[10px] font-semibold uppercase tracking-luxury-widest text-white whitespace-nowrap">
            Conformidade com a Lei Geral de Proteção de Dados • 2026
          </span>
        </div>
      </section>
    </EditorialView>
  );
}
