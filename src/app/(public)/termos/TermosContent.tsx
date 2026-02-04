'use client';
import React from 'react';
import {
  FileText,
  Globe,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import EditorialView from '@/components/layout/EditorialView';
import EditorialCard from '@/components/ui/EditorialCard';
import { div } from 'framer-motion/client';

export default function TermosDeUsoPage() {
  const termosCards = [
    {
      title: 'Aceitação',
      accent: '#B8860B',
      icon: <UserCheck size={32} strokeWidth={1.5} />,
      items: [
        'Concordância integral com nossas diretrizes profissionais',
        'Interface otimizada para seus arquivos no Google Drive™',
        'Uso do serviço implica na aceitação destes termos',
      ],
    },
    {
      title: 'Propriedade',
      accent: '#1a363d',
      icon: <Globe size={32} strokeWidth={1.5} />,
      items: [
        'Manutenção de 100% dos direitos autorais das imagens',
        'Espelhamento dinâmico baseado em suas permissões',
        'Disponibilidade vinculada à sua conta Google ativa',
      ],
    },
    {
      title: 'Segurança',
      accent: '#B8860B',
      icon: <ShieldCheck size={32} strokeWidth={1.5} />,
      items: [
        'Conformidade rigorosa com a LGPD (Brasil)',
        'Tráfego de dados totalmente criptografado',
        'Protocolos oficiais de autenticação de mercado',
      ],
    },
    {
      title: 'Uso de Planos',
      accent: '#1a363d',
      icon: <ShieldAlert size={32} strokeWidth={1.5} />,
      items: [
        'Recursos vinculados ao nível de assinatura ativa',
        'Acesso a funções premium conforme plano vigente',
        'Download em alta resolução conforme contratado',
      ],
    },
    {
      title: 'Responsabilidade',
      accent: '#B8860B',
      icon: <UserCheck size={32} strokeWidth={1.5} />,
      items: [
        'O profissional é o único gestor de seus conteúdos',
        'Respeito aos direitos de imagem de seus clientes',
        'Gestão de acesso via galerias é de responsabilidade do fotógrafo',
      ],
    },
    {
      title: 'Modificações',
      accent: '#1a363d',
      icon: <FileText size={32} strokeWidth={1.5} />,
      items: [
        'Atualizações para refletir melhorias técnicas constantes',
        'Garantia de estabilidade e segurança jurídica',
        'Consulta regular a esta página é recomendada',
      ],
    },
  ];

  return (
    <EditorialView
      title="Termos de Uso"
      subtitle={
        <>
          Diretrizes para uma{' '}
          <span className="font-semibold text-white italic">
            experiência editorial profissional e segura
          </span>
        </>
      }
      sectionTitle="Compromisso Profissional"
      sectionSubtitle="Transparência na nossa relação tecnológica"
      sectionDescription="Estabelecemos diretrizes claras para garantir que seu fluxo de trabalho seja estável, seguro e juridicamente transparente em todas as etapas."
    >
      {/* GRID DE CARDS: CÓDIGO IDENTICO À PRIVACIDADE */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {termosCards.map((card, idx) => (
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
          Termos atualizados em janeiro 2026
        </span>
      </div>
    </EditorialView>
  );
}
