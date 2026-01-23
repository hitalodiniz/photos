'use client';
import React, { useState } from 'react';
import { Check, X, Sparkles, Lock, Loader2 } from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import { PLANS, PlanKey } from '@/core/config/plans';

export default function PlanosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const planosKeys = Object.keys(PLANS) as PlanKey[];

  const features = [
    { label: 'Galerias Ativas', key: 'maxGalleries' },
    {
      label: 'Identidade',
      values: [
        'Link Padrão',
        'Link Padrão',
        'Subdomínio Próprio',
        'Subdomínio Próprio',
      ],
    },
    {
      label: 'Perfil do Fotógrafo',
      values: [
        'Foto + Nome',
        'Full (Bio + Links)',
        'Full (Bio + Links)',
        'Full (Bio + Links)',
      ],
    },
    { label: 'Redes Sociais', values: [false, true, true, true] },
    { label: 'Enviar fotos via WhatsApp', values: [false, true, true, true] },
    { label: 'Download ZIP', values: [false, true, true, true] },
    {
      label: 'Analytics Básico',
      values: [false, 'Cliques Totais', 'Cliques + Origem', 'Cliques + Origem'],
    },
    {
      label: 'Analytics de Fotos',
      values: [false, false, 'Ranking Favoritas', 'Ranking Favoritas'],
    },
    {
      label: 'Suporte por mensagens',
      values: ['Via Ticket', 'Via Ticket', 'WhatsApp VIP', 'WhatsApp VIP'],
    },
    {
      label: 'Suporte por chamada',
      values: [false, false, false, 'Google Meet'],
    },
  ];

  const handleSubscribe = async (planKey: PlanKey) => {
    setLoadingPlan(planKey);
    try {
      const result = null;
      window.location.href = result.url;
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-black">
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title="Planos & Investimento"
          subtitle={
            <>
              Escolha a vitrine ideal para a sua{' '}
              <span className="font-semibold border-b-2 border-champagne text-white">
                carreira fotográfica
              </span>
            </>
          }
        />

        <main className="flex-grow flex items-center justify-center py-4 px-4">
          <section className="w-full max-w-6xl mx-auto bg-white rounded-[3rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl border border-white/20 overflow-x-auto relative">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[850px]">
              <thead>
                <tr className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm">
                  <th className="py-8 px-4 border-b-2 border-slate-900 text-slate-950 italic text-2xl tracking-tight bg-white">
                    Categoria
                  </th>
                  {planosKeys.map((key) => {
                    const p = PLANS[key];
                    const isPremium = key === 'PREMIUM';
                    const isHovered = hoveredPlan === key;
                    return (
                      <th
                        key={key}
                        className={`py-8 px-4 border-b-2 border-slate-900 text-center relative transition-colors duration-300
                        ${isPremium || isHovered ? 'bg-champagne/20' : 'bg-white'}`}
                      >
                        {isPremium && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 bg-slate-950 text-champagne text-[9px] font-semibold uppercase tracking-widest px-4 py-1 rounded-full flex items-center gap-1 animate-pulse">
                            <Sparkles size={10} /> Recomendado
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className={`uppercase tracking-widest text-xs font-semibold ${isPremium ? 'text-gold' : 'text-slate-500'}`}
                          >
                            {p.name}
                          </span>
                          <span className="text-3xl font-semibold text-slate-950">
                            R$ {p.price}
                            <span className="text-[13px] text-slate-700 font-semibold ml-0.5">
                              /mês
                            </span>
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {features.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-5 px-4 border-b border-black/10 font-semibold text-slate-900 text-[10px] md:text-[13px] tracking-wider leading-relaxed">
                      {row.label}
                    </td>
                    {planosKeys.map((key) => {
                      const p = PLANS[key];
                      const cellValue = row.key
                        ? (p as any)[row.key]
                        : row.values?.[planosKeys.indexOf(key)];
                      const isHighlighted =
                        key === 'PREMIUM' || hoveredPlan === key;

                      return (
                        <td
                          key={key}
                          className={`py-5 px-4 border-b border-slate-200 text-center transition-colors duration-300
                          ${isHighlighted ? 'bg-champagne/10 text-slate-950 font-semibold' : 'text-slate-800 font-semibold'}`}
                        >
                          {cellValue === true ? (
                            <Check
                              size={20}
                              strokeWidth={3}
                              className="mx-auto text-gold"
                            />
                          ) : cellValue === false ? (
                            <X
                              size={20}
                              strokeWidth={3}
                              className="mx-auto text-slate-300"
                            />
                          ) : cellValue === Infinity ? (
                            'Ilimitadas'
                          ) : typeof cellValue === 'number' ? (
                            `Até ${cellValue.toString().padStart(2, '0')}`
                          ) : (
                            cellValue
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* LINHA DE AÇÃO COM ÍCONES DINÂMICOS */}
                <tr>
                  <td className="p-8 bg-white border-t border-slate-100"></td>
                  {planosKeys.map((key) => {
                    const IconePlano = PLANS[key].icon;
                    const isPremium = key === 'PREMIUM';
                    return (
                      <td
                        key={key}
                        className={`p-6 text-center transition-colors ${isPremium || hoveredPlan === key ? 'bg-champagne/10' : ''}`}
                        onMouseEnter={() => setHoveredPlan(key)}
                        onMouseLeave={() => setHoveredPlan(null)}
                      >
                        <button
                          onClick={() => handleSubscribe(key)}
                          disabled={!!loadingPlan}
                          // Adicionado gap-2 e removido padding duplicado para melhor simetria
                          className={`w-full py-4 px-4 rounded-2xl font-semibold text-[10px] md:text-[12px] uppercase tracking-widest transition-all flex items-center justify-center gap-2
                            ${
                              isPremium
                                ? 'bg-slate-950 text-champagne hover:scale-105 shadow-xl'
                                : 'bg-white text-slate-950 border-2 border-slate-950 hover:bg-slate-950 hover:text-white'
                            } disabled:opacity-50 group`} // Adicionado 'group' para controlar o hover do ícone
                        >
                          {loadingPlan === key ? (
                            <Loader2
                              size={18}
                              className="animate-spin text-inherit"
                            />
                          ) : (
                            <>
                              <IconePlano
                                size={18}
                                className={`shrink-0 transition-colors ${isPremium ? 'text-champagne' : 'text-slate-950 group-hover:text-white'}`}
                              />
                              <span className="leading-none">
                                {PLANS[key].cta}
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            <div className="mt-2 flex flex-col items-center gap-2">
              <p className="flex items-center justify-center gap-1.5 text-[9px] md:text-xs uppercase tracking-widest text-slate-500 font-semibold whitespace-nowrap">
                <Lock size={14} className="text-gold shrink-0" />
                <span className="leading-none text-slate-700">
                  Transação segura via criptografia SSL
                </span>
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
