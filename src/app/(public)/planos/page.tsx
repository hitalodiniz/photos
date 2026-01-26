'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  X,
  Sparkles,
  Lock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import {
  getPlansByDomain,
  COMMON_FEATURES,
  PlanKey,
} from '@/core/config/plans';

export default function PlanosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    Array.from(new Set(COMMON_FEATURES.map((f) => f.group))),
  );

  const config = useMemo(() => {
    if (typeof window === 'undefined')
      return getPlansByDomain('suagaleria.com.br');
    return getPlansByDomain(window.location.hostname);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const currentPlans = config.plans;
  const planosKeys = Object.keys(currentPlans) as PlanKey[];
  const groups = Array.from(new Set(COMMON_FEATURES.map((f) => f.group)));

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((g) => g !== groupName)
        : [...prev, groupName],
    );
  };

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col bg-luxury-bg theme-${config.theme}`}
    >
      <DynamicHeroBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title={`Investimento ${config.name}`}
          subtitle="Compare nossos planos e escolha a estrutura de elite para sua carreira."
        />

        <main className="flex-grow py-12 px-4 max-w-[1400px] mx-auto w-full">
          {/* Moldura principal com borda Petroleum/40 conforme o Style Guide */}
          <div className="bg-white rounded-luxury border border-petroleum/40 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0 min-w-[1150px]">
                <thead>
                  <tr>
                    {/* Célula Superior Esquerda Fixa */}
                    <th className="p-8 border-b border-r border-petroleum/40 bg-white sticky left-0 z-40">
                      <div className="text-editorial-label-11 text-petroleum/80">
                        Recursos Técnicos
                      </div>
                    </th>

                    {/* Cabeçalhos dos Planos com Ícones */}
                    {planosKeys.map((key) => {
                      const p = currentPlans[key];
                      const isPro = key === 'PRO';
                      const PlanIcon = p.icon;

                      return (
                        <th
                          key={key}
                          className={`p-8 border-b border-r border-petroleum/40 text-center min-w-[210px] transition-all ${isPro ? 'bg-petroleum' : 'bg-white'}`}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div
                              className={`p-2 rounded-xl ${isPro ? 'bg-white/10 text-gold' : 'bg-petroleum/5 text-petroleum'}`}
                            >
                              <PlanIcon size={20} />
                            </div>

                            <span
                              className={`text-editorial-label-11 ${isPro ? 'text-gold' : 'text-slate-800'}`}
                            >
                              {p.name}
                            </span>

                            <div
                              className={`text-3xl font-bold ${isPro ? 'text-white' : 'text-petroleum'}`}
                            >
                              R$ {p.price.toFixed(0)}
                              <span className="text-[10px] uppercase ml-1 opacity-60">
                                /mês
                              </span>
                            </div>

                            {/* Botão de Ação com Ícone Dinâmico */}
                            <button
                              onClick={() => setLoadingPlan(key)}
                              className={
                                isPro
                                  ? 'btn-luxury-primary w-full mt-4 h-10 group'
                                  : 'btn-secondary-white w-full mt-4 h-10 border-petroleum/20 group'
                              }
                            >
                              {loadingPlan === key ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <PlanIcon
                                    size={14}
                                    className="group-hover:scale-110 transition-transform"
                                  />
                                  <span>{p.cta}</span>
                                </div>
                              )}
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {groups.map((group) => {
                    const isExpanded = expandedGroups.includes(group);
                    return (
                      <React.Fragment key={group}>
                        {/* Seção de Grupo Colapsável - Estilo Editorial */}
                        <tr
                          className="cursor-pointer"
                          onClick={() => toggleGroup(group)}
                        >
                          <td
                            colSpan={6}
                            className="bg-petroleum py-3 px-6 border-b border-petroleum/40"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronUp
                                  size={14}
                                  className="text-gold glow-gold"
                                />
                              ) : (
                                <ChevronDown
                                  size={14}
                                  className="text-gold glow-gold"
                                />
                              )}
                              <span className="text-editorial-label-11 text-gold tracking-[0.3em]">
                                {group}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Detalhamento dos Recursos */}
                        {isExpanded &&
                          COMMON_FEATURES.filter((f) => f.group === group).map(
                            (feature, fIdx) => (
                              <tr
                                key={fIdx}
                                className="group hover:bg-slate-50 transition-colors"
                              >
                                <td className="py-4 px-6 border-b border-r border-petroleum/10 bg-white sticky left-0 z-10 font-semibold text-petroleum text-editorial-label-11 whitespace-nowrap">
                                  {feature.label}
                                </td>
                                {planosKeys.map((key, planIdx) => {
                                  const value = feature.key
                                    ? currentPlans[key][feature.key]
                                    : feature.values?.[planIdx];
                                  const isPro = key === 'PRO';

                                  return (
                                    <td
                                      key={key}
                                      className={`py-4 px-4 border-b border-r border-petroleum/10 text-center transition-all ${isPro ? 'bg-petroleum/[0.02]' : ''}`}
                                    >
                                      {value === true ? (
                                        <Check
                                          size={18}
                                          className="mx-auto text-petroleum"
                                          strokeWidth={3}
                                        />
                                      ) : value === false ? (
                                        <X
                                          size={18}
                                          className="mx-auto text-slate-900"
                                          strokeWidth={2}
                                        />
                                      ) : (
                                        <span className="text-editorial-label-11 font-semibold text-petroleum">
                                          {value === Infinity
                                            ? 'Ilimitado'
                                            : value}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ),
                          )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Rodapé de Segurança - Ajustado para visibilidade */}
          <div className="mt-12 mb-8 flex justify-center relative z-20">
            <p className="flex items-center gap-2 text-editorial-label text-champagne bg-petroleum/90 px-6 py-2.5 rounded-luxury backdrop-blur-md border border-gold/30 shadow-2xl">
              <Lock size={12} className="text-gold glow-gold" />
              <span className="tracking-[0.2em]">
                Pagamento Seguro via Criptografia SSL 256-bits
              </span>
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
