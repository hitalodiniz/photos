'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Users,
  FileArchive,
  Link as LinkIcon,
  ShieldCheck,
} from 'lucide-react';
import EditorialCard from '@/components/ui/EditorialCard';
import EditorialView from '@/components/layout/EditorialView';
import {
  getPlansByDomain,
  COMMON_FEATURES,
  PlanKey,
  PERMISSIONS_BY_PLAN,
  PlanPermissions,
} from '@/core/config/plans';
import { Footer } from '@/components/layout';
import { main } from 'framer-motion/client';

export default function PlanosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  const config = useMemo(() => {
    if (typeof window === 'undefined')
      return getPlansByDomain('suagaleria.com.br');
    return getPlansByDomain(window.location.hostname);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentPlans = config.plans;
  const planosKeys = Object.keys(currentPlans) as PlanKey[];
  const groups = Array.from(
    new Set(COMMON_FEATURES.map((f) => f.group.toUpperCase())),
  );

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g, true])), // Começa tudo aberto
  );

  if (!mounted) return null;

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const getFeatureValue = (
    label: string,
    planKey: PlanKey,
    planIdx: number,
  ) => {
    const feature = COMMON_FEATURES.find((f) => f.label === label);
    if (!feature) return '—';
    if (feature.key) {
      const technicalValue =
        PERMISSIONS_BY_PLAN[planKey][feature.key as keyof PlanPermissions];
      return technicalValue === 9999 ? 'Ilimitado' : technicalValue;
    }
    return feature.values?.[planIdx];
  };

  return (
    <EditorialView
      title={`Planos ${config.name}`}
      subtitle="A estrutura definitiva para sua entrega profissional."
    >
      <main className="w-full -mt-8">
        {/* 🎯 HEADER DA SEÇÃO: Seletor de Período */}
        <div className="flex items-center justify-between gap-2 mb-8 bg-slate-50 p-1.5 rounded-full border border-slate-200 shadow-sm max-w-sm w-full mx-auto">
          <button
            onClick={() => setIsAnnual(false)}
            className={`flex-1 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all duration-500 ease-in-out ${
              !isAnnual
                ? 'bg-petroleum text-white shadow-md scale-[1.02]'
                : 'text-petroleum/40 hover:text-petroleum hover:bg-black/5'
            }`}
          >
            Mensal
          </button>

          <button
            onClick={() => setIsAnnual(true)}
            className={`relative flex-1 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all duration-500 ease-in-out ${
              isAnnual
                ? 'bg-petroleum text-white shadow-md scale-[1.02]'
                : 'text-petroleum/40 hover:text-petroleum hover:bg-black/5'
            }`}
          >
            Anual
            <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[12px] px-2 py-0.5 rounded-full font-semibold tracking-normal animate-pulse shadow-sm">
              -20%
            </span>
          </button>
        </div>
        {/* 🎯 GRID DE CARDS: Utilizando EditorialCard para Padronização */}
        <section className="max-w-[1650px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8 items-stretch">
            {planosKeys.map((key, idx) => {
              const plan = { ...currentPlans[key], key };
              const isPro = key === 'PRO';
              const displayPrice = isAnnual ? plan.yearlyPrice : plan.price;

              // Recuperando todos os seus indicadores originais
              const indicators = [
                {
                  icon: <ImageIcon />,
                  label: 'Galerias ativas',
                  value: getFeatureValue('Galerias Ativas', key, idx),
                },
                {
                  icon: <Users />,
                  label: 'Visitantes',
                  value:
                    getFeatureValue(
                      'Formulário de Acesso à galeria',
                      key,
                      idx,
                    ) === false
                      ? 'Acesso Livre'
                      : 'Captura de Leads',
                },
                {
                  icon: <FileArchive />,
                  label: 'Capacidade',
                  value: getFeatureValue('Capacidade por Galeria', key, idx),
                },
                {
                  icon: <FileArchive />,
                  label: 'Resolução ZIP',
                  value: getFeatureValue(
                    'Download ZIP - Tamanho/foto',
                    key,
                    idx,
                  ),
                },
                {
                  icon: <LinkIcon />,
                  label: 'Links externos',
                  value: getFeatureValue(
                    'Links de Download Externos',
                    key,
                    idx,
                  ),
                },
              ];

              return (
                <EditorialCard
                  key={key}
                  title={plan.name}
                  icon={<plan.icon size={32} strokeWidth={1.5} />}
                  accentColor={isPro ? '#B8860B' : '#1a363d'}
                  badge={isPro ? 'Mais Escolhido' : undefined}
                >
                  {/* CONTEÚDO TÉCNICO COMPLETO DENTRO DO CARD */}
                  <div className="text-center mb-2">
                    <div className="flex items-start justify-center gap-1 text-petroleum">
                      <span className="text-[14px] font-semibold mt-2 text-gold">
                        R$
                      </span>
                      <span className="text-5xl font-semibold tracking-tighter italic">
                        {displayPrice.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[9px] font-semibold text-petroleum/70 uppercase tracking-widest mt-1">
                      {isAnnual ? 'Equivalente / mês' : 'Cobrança mensal'}
                    </p>
                  </div>

                  {/* LISTA DE INDICADORES (TODOS OS RECURSOS) */}
                  <div className="space-y-2 mb-4 flex-grow">
                    {indicators.map((ind, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg  flex items-center justify-center shrink-0 text-gold">
                          {React.cloneElement(ind.icon as React.ReactElement, {
                            size: 16,
                            strokeWidth: 2,
                          })}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-semibold text-petroleum leading-tight">
                            {ind.value}
                          </span>
                          <span className="text-[10px] text-petroleum/70 font-medium uppercase tracking-normal">
                            {ind.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setLoadingPlan(key)}
                    disabled={!!loadingPlan}
                    className={`w-full h-12 flex items-center justify-center gap-3 rounded-xl transition-all font-semibold text-[10px] uppercase tracking-widest ${
                      isPro
                        ? 'bg-petroleum text-white shadow-xl hover:bg-black active:scale-95'
                        : 'bg-white border border-petroleum/20 text-petroleum hover:border-petroleum'
                    }`}
                  >
                    {loadingPlan === key ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        {/* Ícone dinâmico do plano alinhado à esquerda do texto */}
                        <plan.icon
                          size={16}
                          strokeWidth={2.5}
                          className={isPro ? 'text-gold' : 'text-petroleum/60'}
                        />
                        <span>{plan.cta}</span>
                      </>
                    )}
                  </button>
                </EditorialCard>
              );
            })}
          </div>
        </section>
        {/* 🎯 TABELA DE ESPECIFICAÇÕES: Refinamento Editorial */}
        <section>
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="text-center mb-4">
              <h2 className="text-petroleum font-semibold text-2xl uppercase tracking-[0.3em] italic">
                Especificações Técnicas
              </h2>
              <div className="max-w-lg h-1 bg-gold mx-auto mt-4 rounded-full opacity-40" />
            </div>

            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-petroleum">
                      <th className="p-6 sticky left-0 z-50 bg-petroleum border-b border-white/5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gold/80">
                          Recursos
                        </span>
                      </th>
                      {planosKeys.map((key) => (
                        <th
                          key={key}
                          className="p-6 text-center border-b border-white/5"
                        >
                          <span className="text-[11px] text-white font-semibold uppercase tracking-widest">
                            {currentPlans[key].name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((groupName) => (
                      <React.Fragment key={groupName}>
                        <tr
                          className="bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => toggleGroup(groupName)}
                        >
                          <td
                            colSpan={6}
                            className="py-4 px-8 border-b border-slate-100"
                          >
                            <div className="flex items-center gap-3">
                              {/* Ícone de Seta da Lucide à Esquerda */}
                              <ChevronDown
                                size={14}
                                strokeWidth={2.5}
                                className={`text-gold transition-transform duration-500 ease-in-out ${
                                  expandedGroups[groupName]
                                    ? 'rotate-0'
                                    : '-rotate-90'
                                }`}
                              />

                              <span className="text-[10px] font-bold uppercase tracking-luxury-widest text-gold select-none">
                                {groupName}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Condição de exibição para o grupo */}
                        {expandedGroups[groupName] &&
                          COMMON_FEATURES.filter(
                            (f) => f.group.toUpperCase() === groupName,
                          ).map((feature, fIdx) => (
                            <tr
                              key={fIdx}
                              className="hover:bg-slate-50 transition-colors group"
                            >
                              <td className="py-4 px-8 border-b border-slate-100 bg-white sticky left-0 z-30 text-[12px] font-semibold text-petroleum">
                                {feature.label}
                              </td>
                              {planosKeys.map((key, pIdx) => (
                                <td
                                  key={key}
                                  className="py-4 px-4 border-b border-slate-100 text-center"
                                >
                                  <div className="flex items-center justify-center">
                                    {getFeatureValue(
                                      feature.label,
                                      key,
                                      pIdx,
                                    ) === true ? (
                                      <Check
                                        size={18}
                                        className="text-emerald"
                                        strokeWidth={3}
                                      />
                                    ) : getFeatureValue(
                                        feature.label,
                                        key,
                                        pIdx,
                                      ) === false ? (
                                      <X
                                        size={16}
                                        className="text-slate-600"
                                        strokeWidth={2}
                                      />
                                    ) : (
                                      <span className="text-[12px] font-medium text-petroleum">
                                        {getFeatureValue(
                                          feature.label,
                                          key,
                                          pIdx,
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-petroleum border border-white/10 px-8 py-4 rounded-full backdrop-blur-xl w-fit mx-auto mt-10">
            <ShieldCheck size={20} className="text-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-luxury-widest text-white whitespace-nowrap">
              Pagamento Seguro via Criptografia Bancária • 2026
            </span>
          </div>
        </section>
      </main>
    </EditorialView>
  );
}
