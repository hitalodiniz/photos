'use client';

import React, { useState } from 'react';
import { ShieldCheck, Database, Share2, Lock } from 'lucide-react';
import EditorialView from '@/components/layout/EditorialView';
import EditorialCard from '@/components/ui/EditorialCard';
import BaseModal from '@/components/ui/BaseModal';

/**
 * 🔒 Conteúdo da Política de Privacidade
 */
export const PrivacyPolicyContent = () => (
  <div className="space-y-8 text-petroleum/90 leading-relaxed text-sm md:text-base text-justify">
    {/* 1. COLETA */}
    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-gold rounded-full" />
        1. Coleta de Informações e Cookies
      </h3>
      <p className="pl-4">
        Coletamos dados essenciais para a operação: nome e e-mail via Google
        Auth para proprietários de contas, e dados técnicos automatizados (IP,
        dispositivo e navegador) para todos os usuários, incluindo visitantes de
        galerias. Utilizamos <strong>cookies de sessão</strong> estritamente
        necessários para manter a segurança e a funcionalidade da plataforma.
      </p>
    </section>

    {/* 2. CONTEÚDO */}
    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-gold rounded-full" />
        2. Visualização de Conteúdo e Metadados
      </h3>
      <ul className="pl-8 space-y-3 list-none">
        <li className="relative">
          <span className="absolute -left-4 text-gold">•</span>
          <strong>Hospedagem:</strong> Suas fotos permanecem exclusivamente no
          seu Google Drive™. Nossa interface realiza apenas o espelhamento
          técnico para visualização.
        </li>
        <li className="relative">
          <span className="absolute -left-4 text-gold">•</span>
          <strong>Metadados:</strong> Não realizamos o "strip" (remoção) de
          dados EXIF ou GPS. A preservação da integridade do arquivo original é
          de responsabilidade do provedor de armazenamento (Google).
        </li>
        <li className="relative">
          <span className="absolute -left-4 text-gold">•</span>
          <strong>Proteção contra IA:</strong> Declaramos que não utilizamos,
          vendemos ou licenciamos suas imagens para treinamento de modelos de
          Inteligência Artificial ou Machine Learning.
        </li>
      </ul>
    </section>

    {/* 3. ARMAZENAMENTO */}
    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-gold rounded-full" />
        3. Armazenamento e Subprocessadores
      </h3>
      <p className="pl-4">
        Para manter o serviço ativo, utilizamos subprocessadores de confiança
        para infraestrutura de nuvem e banco de dados.
        <strong> Não vendemos seus dados.</strong> O compartilhamento ocorre
        apenas para fins operacionais (processamento de pagamentos) ou por
        cumprimento de ordem judicial brasileira.
      </p>
    </section>

    {/* 4. DIREITOS */}
    <section>
      <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-gold rounded-full" />
        4. Seus Direitos e Retenção (LGPD)
      </h3>
      <p className="pl-4">
        Você possui o direito de acesso, correção e exclusão de seus dados. A
        exclusão da conta resulta na remoção imediata de tokens de acesso e
        configurações de galeria. Logs de segurança podem ser retidos por
        períodos mínimos exigidos pelo
        <strong> Marco Civil da Internet</strong> para fins de auditoria e
        proteção jurídica.
      </p>
    </section>

    {/* RODAPÉ JURÍDICO */}
    <section className="bg-slate-50 p-6 rounded-luxury border-l-4 border-gold text-xs md:text-sm italic">
      Esta política é regida pelas leis da República Federativa do Brasil, em
      conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº
      13.709/2018).
    </section>
  </div>
);

/**
 * 📦 Modal de Privacidade
 */
export function PrivacyPolicyModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Política de Privacidade"
      subtitle="Privacidade e Proteção de Dados"
      headerIcon={<Lock size={20} />}
      maxWidth="6xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <span className="text-[10px] text-white/80 uppercase tracking-widest">
            Fevereiro 2026 • Versão 1.0
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-champagne text-petroleum text-[10px] font-semibold uppercase rounded-luxury hover:bg-white transition-colors"
          >
            Entendido
          </button>
        </div>
      }
    >
      <PrivacyPolicyContent />
    </BaseModal>
  );
}

export default function PRIVACIDADEPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const privacidadeCards = [
    {
      title: 'Google Drive™',
      accent: 'gold',
      icon: <Share2 size={32} strokeWidth={1.5} />,
      items: [
        'Uso estrito do escopo de leitura (readonly)',
        'Espelhamento dinâmico sem alteração de arquivos',
        'Não coletamos ou removemos metadados (EXIF/GPS)',
      ],
    },
    {
      title: 'Propriedade e IA',
      accent: 'petroleum',
      icon: <Database size={32} strokeWidth={1.5} />,
      items: [
        'Suas fotos permanecem sob seu controle absoluto',
        'Não usamos suas imagens para treinar modelos de IA',
        'Imagens permanecem no seu próprio Drive original',
      ],
    },
    {
      title: 'Dados Técnicos',
      accent: 'gold',
      icon: <Lock size={32} strokeWidth={1.5} />,
      items: [
        'Autenticação via Google Auth (OAuth2 oficial)',
        'Logs de segurança (IP e dispositivo) para sua proteção',
        'Não vendemos ou compartilhamos dados com terceiros',
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
    <>
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
        showPrivacyAction={true}
        onPrivacyClick={() => setIsModalOpen(true)}
      >
        {editorialContent}
      </EditorialView>

      <PrivacyPolicyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
