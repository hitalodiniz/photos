'use client';

import React from 'react';
import {
  FileText,
  Globe,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import EditorialView from '@/components/layout/EditorialView';

export default function TermosDeUsoPage() {
  const termosItems = [
    {
      icon: <UserCheck size={18} />,
      title: 'Aceitação',
      summary: 'Ao utilizar o app, você concorda com nossas diretrizes.',
      desc: 'Este serviço é um visualizador de mídia otimizado que atua como interface para seus arquivos no Google Drive™.',
    },
    {
      icon: <Globe size={18} />,
      title: 'Propriedade',
      summary: 'Você mantém 100% dos direitos sobre suas imagens.',
      desc: 'Nossa tecnologia realiza um espelhamento dinâmico. A disponibilidade depende das permissões da sua conta Google.',
    },
    {
      icon: <ShieldCheck size={18} />,
      title: 'Segurança',
      isHighlight: true,
      summary: 'Conformidade rigorosa com a proteção de dados.',
      desc: 'O tráfego é criptografado e as credenciais seguem os protocolos oficiais da Lei Geral de Proteção de Dados (LGPD).',
    },
    {
      icon: <ShieldAlert size={18} />,
      title: 'Uso de Planos',
      summary: 'Recursos vinculados ao nível de assinatura ativa.',
      desc: 'O acesso a funções como downloads em alta resolução e customizações é determinado pelo seu plano vigente.',
    },
    {
      icon: <UserCheck size={18} />,
      title: 'Responsabilidade',
      summary: 'O profissional é o único gestor de seus conteúdos.',
      desc: 'Cabe ao usuário garantir que a divulgação respeite os direitos de imagem acordados com seus clientes finais.',
    },
    {
      icon: <FileText size={18} />,
      title: 'Modificações',
      summary: 'Termos atualizados para refletir melhorias técnicas.',
      desc: 'Reservamos o direito de ajustar estes termos para garantir estabilidade. Consulte esta página regularmente.',
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
    >
      <div className="max-w-[1400px] mx-auto">
        {/* GRID DE TERMOS: 3 Colunas no Desktop para Densidade de Dados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-6">
          {termosItems.map((item, index) => (
            <div
              key={index}
              className={`flex flex-col bg-white rounded-luxury overflow-hidden shadow-xl transition-all border ${
                item.isHighlight
                  ? 'border-gold/30 ring-1 ring-gold/20'
                  : 'border-slate-100'
              }`}
            >
              {/* HEADER DO CARD: Estilo Glass Petroleum */}
              <div className="bg-petroleum backdrop-blur-md px-4 h-11 flex items-center gap-3 shrink-0 border-b border-white/10">
                <div className="text-gold shrink-0 drop-shadow-[0_0_8px_rgba(243,229,171,0.3)]">
                  {item.icon}
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-luxury-widest text-white leading-none">
                  {item.title}
                </h3>
              </div>

              {/* CORPO DO CARD: Compactado para 3 colunas */}
              <div className="p-6 bg-white flex-grow">
                <p className="text-[13px] leading-relaxed text-petroleum/80 font-bold italic mb-3">
                  {item.summary}
                </p>
                <p className="text-[12px] leading-relaxed text-petroleum/60 font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER DA PÁGINA: Selo de Protocolo Transparente */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-full backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-luxury-widest text-white/50">
              Vigência: Ciclo Janeiro 2026
            </span>
          </div>
        </div>
      </div>
    </EditorialView>
  );
}
