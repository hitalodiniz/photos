'use client';

import React from 'react';
import { ShieldCheck, Database, Share2, Lock } from 'lucide-react';
import EditorialView from '@/components/layout/EditorialView';

export default function PrivacidadePage() {
  const privacidadeItems = [
    {
      icon: <Share2 size={18} />,
      title: 'Google Drive™',
      summary: 'Uso estrito do escopo de leitura para espelhamento.',
      desc: "Utilizamos o acesso 'readonly' exclusivamente para listar arquivos e gerar miniaturas. Não realizamos alterações ou exclusões em seus arquivos originais.",
    },
    {
      icon: <Database size={18} />,
      title: 'Propriedade',
      summary: 'Suas fotos permanecem sob seu controle absoluto.',
      desc: 'Não realizamos cópia ou armazenamento permanente. Atuamos como um espelhamento dinâmico: as imagens permanecem armazenadas no seu próprio Drive.',
    },
    {
      icon: <Lock size={18} />,
      title: 'Acesso Técnico',
      summary: 'Autenticação robusta para proteção de dados.',
      desc: 'Implementamos autenticação protegida por cookies técnicos de sessão que expiram automaticamente. Seus dados de login realizado via Google são criptografados.',
      isHighlight: true,
    },
    {
      icon: <ShieldCheck size={18} />,
      title: 'Conformidade',
      summary: 'Respeito integral à Lei Geral de Proteção de Dados.',
      desc: 'Nenhum dado pessoal ou biométrico contido nas fotos é processado. Nossa operação é desenhada para ser transparente e segura para fotógrafos.',
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
      <div className="max-w-[1200px] mx-auto">
        {/* GRID DE PRIVACIDADE: Mesma cor de cabeçalho da Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
          {privacidadeItems.map((item, index) => (
            <div
              key={index}
              className={`flex flex-col bg-white rounded-luxury overflow-hidden shadow-2xl transition-all border ${
                item.isHighlight
                  ? 'border-gold/30 ring-1 ring-gold/20'
                  : 'border-slate-100'
              }`}
            >
              {/* HEADER DO CARD: Sincronizado com a Toolbar (Petroleum/95) */}
              <div className="bg-petroleum backdrop-blur-md px-5 h-11 flex items-center gap-4 shrink-0 border-b border-white/10">
                <div className="text-gold shrink-0 drop-shadow-[0_0_8px_rgba(243,229,171,0.4)]">
                  {item.icon}
                </div>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.15em] text-white leading-none">
                  {item.title}
                </h3>
                {item.isHighlight && (
                  <span className="ml-auto text-[8px] bg-gold text-black px-2 py-0.5 rounded-full font-black">
                    SECURITY
                  </span>
                )}
              </div>

              {/* CORPO DO CARD */}
              <div className="p-7 bg-white">
                <p className="text-[14px] leading-relaxed text-petroleum/80 font-bold italic mb-3">
                  {item.summary}
                </p>
                <p className="text-[13px] leading-relaxed text-petroleum/60 font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* SELO DE PROTOCOLO ATIVO - Compacto */}
        <div className="flex justify-center">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-full backdrop-blur-xl">
            <ShieldCheck size={16} className="text-gold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              Protocolo atualizado em janeiro de 2026
            </span>
          </div>
        </div>
      </div>
    </EditorialView>
  );
}
