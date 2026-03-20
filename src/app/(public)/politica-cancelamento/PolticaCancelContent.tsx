// src/app/(public)/politica-cancelamento/page.tsx
'use client';

import React, { useState } from 'react';
import {
  CalendarClock,
  Banknote,
  TrendingDown,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import EditorialView from '@/components/layout/EditorialView';
import EditorialCard from '@/components/ui/EditorialCard';
import BaseModal from '@/components/ui/BaseModal';

/**
 * 📄 Conteúdo da Política de Cancelamento
 */
export const CancellationPolicyContent = () => {
  return (
    <div className="space-y-8 text-petroleum/90 leading-relaxed text-sm md:text-base text-justify">
      {/* 1. DIREITO DE ARREPENDIMENTO */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          1. Direito de Arrependimento — Dentro de 7 dias
        </h3>
        <p className="pl-4 mb-3">
          Em conformidade com o Art. 49 do Código de Defesa do Consumidor, você
          tem <strong className="text-petroleum">7 dias corridos</strong> a
          partir da data de contratação para exercer o direito de
          arrependimento. Dentro desse prazo, dois caminhos estão disponíveis:
        </p>

        {/* Opção A */}
        <div className="pl-4 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Opção A — Cancelamento com estorno total
            </p>
            <ul className="space-y-1.5 pl-4">
              {[
                'A assinatura é cancelada imediatamente',
                'O valor integral pago é estornado para a forma de pagamento original',
                'O estorno é processado em até 48h úteis (cartão de crédito pode levar até 2 faturas)',
                'A conta retorna imediatamente para o plano gratuito (FREE)',
                'Galerias e fotos excedentes aos limites FREE são arquivadas automaticamente',
              ].map((item, i) => (
                <li
                  key={i}
                  className="relative text-[12px] text-emerald-900 pl-3"
                >
                  <span className="absolute left-0 text-emerald-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Opção B */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Opção B — Downgrade com crédito pro-rata (sem estorno)
            </p>
            <p className="text-[12px] text-amber-900 mb-2">
              Ao escolher esta opção, você{' '}
              <strong>abre mão expressamente do direito de estorno</strong> e
              opta por aproveitar o crédito dos dias não utilizados do plano
              atual no plano inferior escolhido.
            </p>
            <ul className="space-y-1.5 pl-4">
              {[
                'O crédito pro-rata (dias não usados) é calculado e aplicado ao novo plano',
                'Se o crédito cobrir integralmente o novo plano: nenhum valor é cobrado e a nova data de vencimento é calculada automaticamente',
                'Se o crédito for parcial: você paga apenas a diferença imediatamente',
                'A mudança de plano é efetivada imediatamente',
                'Nenhum estorno é processado após a escolha desta opção',
              ].map((item, i) => (
                <li
                  key={i}
                  className="relative text-[12px] text-amber-900 pl-3"
                >
                  <span className="absolute left-0 text-amber-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 2. FORA DOS 7 DIAS */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          2. Cancelamento e Downgrade — Após 7 dias
        </h3>
        <div className="pl-4 space-y-3">
          <p>
            Após o prazo de arrependimento, o cancelamento e o downgrade seguem
            a política padrão de mercado:
          </p>
          <ul className="space-y-2 pl-4">
            {[
              'Nenhum estorno é aplicável após 7 dias da contratação',
              'O acesso ao plano contratado é mantido até o fim do ciclo pago',
              'O downgrade para plano inferior é agendado para o dia seguinte ao vencimento do ciclo atual',
              'A nova assinatura (plano inferior) inicia automaticamente na data agendada',
              'Galerias e fotos excedentes são arquivadas automaticamente após a transição',
            ].map((item, i) => (
              <li key={i} className="relative text-[13px] pl-3">
                <span className="absolute left-0 text-gold">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. CÁLCULO PRO-RATA */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          3. Cálculo do Crédito Pro-Rata
        </h3>
        <div className="pl-4 space-y-3">
          <p>
            O crédito pro-rata é calculado com base nos dias comerciais não
            utilizados do ciclo atual, proporcional ao valor pago:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-[12px] text-petroleum space-y-1">
            <p>Ciclo mensal = 30 dias comerciais</p>
            <p>Ciclo semestral = 180 dias comerciais</p>
            <p>Ciclo anual = 360 dias comerciais</p>
            <p className="pt-2 border-t border-slate-200">
              Crédito = (Valor pago / Total dias) × Dias restantes
            </p>
          </div>
          <p className="text-[12px] text-petroleum/70">
            O crédito é aplicado automaticamente pelo sistema no momento da
            troca de plano e não é transferível, resgatável em dinheiro (exceto
            na Opção A dentro dos 7 dias) nem acumulável entre ciclos.
          </p>
        </div>
      </section>

      {/* 4. REATIVAÇÃO */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          4. Reativação de Assinatura
        </h3>
        <p className="pl-4">
          Assinaturas canceladas ou expiradas podem ser reativadas a qualquer
          momento. A reativação inicia um novo ciclo de cobrança e{' '}
          <strong className="text-petroleum">
            não restaura automaticamente
          </strong>{' '}
          galerias ou conteúdos arquivados durante o período de downgrade. O
          usuário deverá reativar manualmente as galerias dentro dos novos
          limites do plano contratado.
        </p>
      </section>

      {/* 5. INADIMPLÊNCIA */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-petroleum mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-gold rounded-full" />
          5. Inadimplência e Suspensão Automática
        </h3>
        <p className="pl-4">
          O não pagamento de qualquer cobrança recorrente resulta na suspensão
          automática dos recursos premium. O acesso é restabelecido
          automaticamente após a compensação do pagamento em aberto, sem
          necessidade de contato com o suporte.
        </p>
      </section>

      {/* Rodapé legal */}
      <section className="bg-slate-50 p-6 rounded-luxury border-l-4 border-gold space-y-3">
        <p className="text-xs md:text-sm">
          <strong className="text-petroleum uppercase tracking-tighter">
            Base Legal:
          </strong>{' '}
          Esta política é regida pelo Código de Defesa do Consumidor (Lei nº
          8.078/1990), em especial o Art. 49 (direito de arrependimento), e
          pelas normas do Banco Central do Brasil aplicáveis a meios de
          pagamento eletrônico.
        </p>
        <p className="text-xs md:text-sm">
          <strong className="text-petroleum uppercase tracking-tighter">
            Foro:
          </strong>{' '}
          Eventuais litígios serão resolvidos no foro da Comarca de Belo
          Horizonte/MG, conforme eleito nos Termos de Serviço.
        </p>
      </section>
    </div>
  );
};

/**
 * 📦 Modal reutilizável — pode ser chamado no checkout ou no modal de cancelamento
 */
export function CancellationPolicyModal({
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
      title="Política de Cancelamento"
      subtitle="Regras de reembolso, downgrade e arrependimento"
      headerIcon={<ShieldCheck size={20} />}
      maxWidth="6xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <span className="text-[10px] text-white/80 uppercase tracking-widest">
            20 de março 2026 • Versão 1.0
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-champagne text-petroleum text-[10px] font-semibold uppercase rounded-luxury hover:bg-white transition-colors"
          >
            Compreendi a Política
          </button>
        </div>
      }
    >
      <CancellationPolicyContent />
    </BaseModal>
  );
}

/**
 * 📄 Página pública /politica-cancelamento
 */
export default function PoliticaCancelamentoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cards = [
    {
      title: 'Arrependimento (7 dias)',
      accent: 'gold',
      icon: <Banknote size={32} strokeWidth={1.5} />,
      items: [
        'Estorno total dentro de 7 dias da contratação',
        'Retorno imediato ao plano FREE',
        'Estorno processado em até 48h úteis',
      ],
    },
    {
      title: 'Downgrade com Crédito',
      accent: 'petroleum',
      icon: <TrendingDown size={32} strokeWidth={1.5} />,
      items: [
        'Disponível dentro dos 7 dias (abre mão do estorno)',
        'Crédito pro-rata aplicado ao plano inferior',
        'Mudança efetivada imediatamente',
      ],
    },
    {
      title: 'Após 7 dias',
      accent: 'gold',
      icon: <CalendarClock size={32} strokeWidth={1.5} />,
      items: [
        'Sem estorno após o prazo de arrependimento',
        'Acesso mantido até o fim do ciclo pago',
        'Downgrade agendado para o próximo vencimento',
      ],
    },
    {
      title: 'Cálculo Pro-Rata',
      accent: 'petroleum',
      icon: <RefreshCw size={32} strokeWidth={1.5} />,
      items: [
        'Baseado em dias comerciais não utilizados',
        'Proporcional ao valor efetivamente pago',
        'Aplicado automaticamente pelo sistema',
      ],
    },
    {
      title: 'Reativação',
      accent: 'gold',
      icon: <ShieldCheck size={32} strokeWidth={1.5} />,
      items: [
        'Reativação disponível a qualquer momento',
        'Novo ciclo de cobrança inicia na reativação',
        'Galerias arquivadas reativadas manualmente',
      ],
    },
    {
      title: 'Inadimplência',
      accent: 'petroleum',
      icon: <Clock size={32} strokeWidth={1.5} />,
      items: [
        'Suspensão automática por falta de pagamento',
        'Restabelecimento automático após compensação',
        'Sem necessidade de contato com suporte',
      ],
    },
  ];

  return (
    <>
      <EditorialView
        title="Política de Cancelamento"
        subtitle={
          <>
            Regras claras para{' '}
            <span className="font-semibold text-white italic">
              cancelamentos, reembolsos e downgrade de planos
            </span>
          </>
        }
        sectionTitle="Transparência no Cancelamento"
        sectionSubtitle="Seus direitos e nossas regras explicados sem letras miúdas"
        sectionDescription="Seguimos o Código de Defesa do Consumidor e as melhores práticas do mercado SaaS. Você tem controle total sobre sua assinatura a qualquer momento."
        showTermsAction={true}
        onTermsClick={() => setIsModalOpen(true)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {cards.map((card, idx) => (
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

      <CancellationPolicyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
