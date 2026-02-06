'use client';

import React, { useState } from 'react';
import {
  FileText,
  Globe,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import EditorialView from '@/components/layout/EditorialView';
import EditorialCard from '@/components/ui/EditorialCard';
import BaseModal from '@/components/ui/BaseModal';
import { PLANS_BY_SEGMENT } from '@/core/config/plans';

/**
 * 📄 Conteúdo Jurídico Estilizado
 * Exportado para ser usado de forma independente se necessário.
 */
export const TermsOfServiceContent = () => {
  // Captura o segmento da variável de ambiente (Default para PHOTOGRAPHER)
  const currentSegment = (process.env.NEXT_PUBLIC_APP_SEGMENT ||
    'PHOTOGRAPHER') as keyof typeof PLANS_BY_SEGMENT;

  // Obtém as informações dos planos para o segmento atual
  const segmentPlans = PLANS_BY_SEGMENT[currentSegment];

  // Gera a string de nomes (ex: "Free, Start, Plus, Pro e Premium")
  const planNames = Object.values(segmentPlans)
    .map((p) => p.name)
    .join(', ')
    .replace(/, ([^,]*)$/, ' e $1');

  return (
    <div className="space-y-8 text-petroleum/90 leading-relaxed text-sm md:text-base text-justify">
      {/* 1. NATUREZA */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          1. Natureza do Serviço e Registro
        </h3>
        <p className="pl-4">
          Fornecemos uma interface de{' '}
          <strong className="text-petroleum">espelhamento dinâmico</strong> para
          arquivos do Google Drive™. O serviço depende da manutenção de uma
          conta ativa no Google. Você é o único responsável por todas as
          atividades realizadas em sua conta e por manter a segurança de suas
          credenciais de acesso.
        </p>
      </section>

      {/* 2. LIMITAÇÃO */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          2. Limitação de Responsabilidade (Drive e Terceiros)
        </h3>
        <ul className="pl-8 space-y-3 list-none">
          <li className="relative">
            <span className="absolute -left-4 text-gold">•</span>
            <strong>Custódia de Arquivos:</strong> Não somos um serviço de
            armazenamento. A exclusão de arquivos no Google Drive™ resulta na
            remoção imediata da exibição na plataforma. Não recuperamos arquivos
            deletados na origem.
          </li>
          <li className="relative">
            <span className="absolute -left-4 text-gold">•</span>
            <strong>Uso de Terceiros:</strong> Não nos responsabilizamos pelo
            uso, download indevido ou distribuição de imagens por terceiros que
            acessem links de galerias públicas gerados pelo usuário.
          </li>
          <li className="relative">
            <span className="absolute -left-4 text-gold">•</span>
            <strong>Estabilidade:</strong> Embora busquemos 100% de
            disponibilidade, não garantimos que o serviço será livre de erros ou
            interrupções causadas por falhas na API do Google™ ou provedores de
            internet.
          </li>
        </ul>
      </section>

      {/* 3. PROPRIEDADE */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          3. Propriedade e Licença Técnica
        </h3>
        <p className="pl-4">
          Você mantém a propriedade integral de seus direitos autorais. Ao
          utilizar a plataforma, você nos concede uma licença limitada e não
          exclusiva apenas para processar, redimensionar (miniaturas) e exibir
          seus conteúdos conforme solicitado pelas configurações de sua galeria.
        </p>
      </section>

      {/* 4. PAGAMENTOS */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          4. Pagamentos, Assinaturas e Reembolsos
        </h3>
        <p className="pl-4">
          O acesso aos recursos ({planNames}) depende de pagamento regular. O
          cancelamento interrompe o acesso aos recursos premium ao final do
          ciclo pago. Em conformidade com o Código de Defesa do Consumidor,
          garantimos o direito de arrependimento de 7 dias para a primeira
          assinatura.
        </p>
      </section>

      {/* 5. CONDUTA */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          5. Conduta Proibida e Rescisão
        </h3>
        <p className="pl-4">
          É proibido: (a) hospedar material ilegal ou que viole direitos de
          imagem de terceiros; (b) tentar realizar engenharia reversa na
          plataforma; (c) usar automações (bots) para extração de dados. A
          violação destes termos resulta na rescisão imediata da conta sem
          direito a reembolso.
        </p>
      </section>

      {/* JURISDIÇÃO */}
      <section className="bg-slate-50 p-6 rounded-luxury border-l-4 border-gold space-y-3">
        <p className="text-xs md:text-sm">
          <strong className="text-petroleum uppercase tracking-tighter">
            Limitação de Danos:
          </strong>{' '}
          Em nenhuma circunstância a nossa responsabilidade total excederá o
          valor pago pelo usuário nos últimos 6 meses de serviço.
        </p>
        <p className="text-xs md:text-sm">
          <strong className="text-petroleum uppercase tracking-tighter">
            Foro:
          </strong>{' '}
          Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da
          Comarca de Belo Horizonte/MG para dirimir quaisquer controvérsias.
        </p>
      </section>
    </div>
  );
};

/**
 * 📦 Componente de Modal Reutilizável
 * Pode ser chamado no Onboarding ou em qualquer CTA de Termos.
 */
export function TermsOfServiceModal({
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
      title="Termos de Serviço"
      subtitle="Documentação Legal e Diretrizes de Uso"
      headerIcon={<ShieldCheck size={20} />}
      maxWidth="6xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <span className="text-[10px] text-white/80 uppercase tracking-widest">
            4 de fevereiro 2026 • Versão 1.0
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-champagne text-petroleum text-[10px] font-semibold uppercase rounded-luxury hover:bg-white transition-colors"
          >
            Compreendi os Termos
          </button>
        </div>
      }
    >
      <TermsOfServiceContent />
    </BaseModal>
  );
}

export default function TermosDeUsoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const termosCards = [
    {
      title: 'Aceitação',
      accent: 'gold',
      icon: <UserCheck size={32} strokeWidth={1.5} />,
      items: [
        'Concordância integral com nossas diretrizes profissionais',
        'Adesão automática ao utilizar o portal ou serviços trial',
        'Trial e assinaturas expiram conforme prazos do sistema',
      ],
    },
    {
      title: 'Propriedade & Backup',
      accent: 'petroleum',
      icon: <Globe size={32} strokeWidth={1.5} />,
      items: [
        'Direitos autorais permanecem 100% com o profissional',
        'O app NÃO é um serviço de backup; mantenha cópias locais',
        'Não nos responsabilizamos por falhas técnicas no Google Drive™',
      ],
    },
    {
      title: 'Segurança e Acesso',
      accent: 'gold',
      icon: <ShieldCheck size={32} strokeWidth={1.5} />,
      items: [
        'Responsabilidade total do usuário sobre suas credenciais',
        'Segurança de galerias privadas via senhas e autenticação',
        'Não somos responsáveis pelo uso de imagens em links públicos',
      ],
    },
    {
      title: 'Uso de Planos',
      accent: 'petroleum',
      icon: <ShieldAlert size={32} strokeWidth={1.5} />,
      items: [
        'Funções vinculadas estritamente ao nível de plano vigente',
        'Pagamentos processados via protocolos oficiais seguros',
        'Reembolsos para serviços digitais seguem normas do CDC',
      ],
    },
    {
      title: 'Proibições',
      accent: 'gold',
      icon: <UserCheck size={32} strokeWidth={1.5} />,
      items: [
        'Proibido burlar travas de segurança ou scraping de dados',
        'Vedado o uso de ferramentas automatizadas no portal',
        'Hospedagem de conteúdo ilegal gera rescisão imediata',
      ],
    },
    {
      title: 'Geral',
      accent: 'petroleum',
      icon: <FileText size={32} strokeWidth={1.5} />,
      items: [
        'Atualizações constantes para melhoria da estabilidade',
        'Direito de suspender acessos por inadimplência',
        'Uso contínuo após mudanças implica nova aceitação',
      ],
    },
  ];

  return (
    <>
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
        // 🎯 Integração com o Hero:
        showTermsAction={true}
        onTermsClick={() => setIsModalOpen(true)}
      >
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
      </EditorialView>
      <TermsOfServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
