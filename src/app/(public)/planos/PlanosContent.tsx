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
  SegmentType,
  PLANS_BY_SEGMENT,
} from '@/core/config/plans';

import { useSegment } from '@/hooks/useSegment';

export default function PlanosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  // 🎯 Injeção da lógica reativa: segment e terms agora mudam via ThemeSwitcher
  const { segment, terms } = useSegment();

  const config = useMemo(() => {
    if (typeof window === 'undefined')
      return getPlansByDomain('suagaleria.com.br');
    return getPlansByDomain(window.location.hostname);
  }, []);

  useEffect(() => {
    setMounted(true);
    // Inicializa grupos expandidos
    const groups = Array.from(
      new Set(COMMON_FEATURES.map((f) => f.group.toUpperCase())),
    );
    setExpandedGroups(Object.fromEntries(groups.map((g) => [g, true])));
  }, []);

  if (!mounted) return null;

  // Filtra os planos exclusivos do segmento ativo (CAMPAIGN, OFFICE, etc)
  const segmentPlans =
    PLANS_BY_SEGMENT[segment as keyof typeof PLANS_BY_SEGMENT];
  const planosKeys = Object.keys(segmentPlans) as PlanKey[];
  const groups = Array.from(
    new Set(COMMON_FEATURES.map((f) => f.group.toUpperCase())),
  );

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const getFeatureValue = (
    label: string,
    planKey: PlanKey,
    planIdx: number,
  ) => {
    const feature = COMMON_FEATURES.find((f) => f.label === label);
    if (!feature) return '—';
    if (feature.key) {
      const val =
        PERMISSIONS_BY_PLAN[planKey][feature.key as keyof PlanPermissions];
      return val === 9999 ? 'Ilimitado' : val;
    }
    return feature.values?.[planIdx];
  };

  return (
    <EditorialView
      title="Planos"
      subtitle={`A estrutura definitiva para sua entrega como ${terms.singular}.`} // 🎯 Reativo ao segmento
    >
      <main className="w-full -mt-4 md:-mt-8">
        {/* SELETOR DE PERÍODO */}
        <div className="flex items-center justify-between gap-2 mb-10 bg-slate-50 p-1.5 rounded-full border border-slate-200 shadow-sm max-w-[280px] md:max-w-sm w-full mx-auto">
          <button
            onClick={() => setIsAnnual(false)}
            className={`flex-1 py-2 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${!isAnnual ? 'bg-petroleum text-white shadow-md' : 'text-petroleum/40'}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`relative flex-1 py-2 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all ${isAnnual ? 'bg-petroleum text-white shadow-md' : 'text-petroleum/40'}`}
          >
            Anual
            <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              -20%
            </span>
          </button>
        </div>

        {/* GRID DE CARDS */}
        <section className="max-w-[1650px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mb-12">
            {planosKeys.map((key, idx) => {
              const planInfo = segmentPlans[key as keyof typeof segmentPlans];
              const isPro = key === 'PRO';
              const displayPrice = isAnnual
                ? planInfo.yearlyPrice
                : planInfo.price;

              const indicators = [
                {
                  icon: <ImageIcon />,
                  label: `Galerias ativas`, // 🎯 Reativo (ex: Militantes ativas)
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
                      : 'Cadastro de visitantes',
                },
                {
                  icon: <FileArchive />,
                  label: `Capacidade por ${terms.item}`, // 🎯 Reativo (ex: por Candidato)
                  value: getFeatureValue('Capacidade por Galeria', key, idx),
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
                  title={planInfo.name}
                  icon={<planInfo.icon size={32} strokeWidth={1.5} />}
                  accentColor={isPro ? 'gold' : 'champagne'}
                  badge={isPro ? 'Mais Escolhido' : undefined}
                >
                  <div className="text-center mb-4">
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

                  <div className="space-y-2 mb-6 flex-grow">
                    {indicators.map((ind, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-gold">
                          {React.cloneElement(ind.icon as any, {
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
                        <planInfo.icon
                          size={16}
                          strokeWidth={2.5}
                          className={isPro ? 'text-gold' : 'text-petroleum/60'}
                        />
                        <span>{planInfo.cta}</span>
                      </>
                    )}
                  </button>
                </EditorialCard>
              );
            })}
          </div>
        </section>

        {/* TABELA TÉCNICA - Melhoria de Scroll Mobile */}
        <section>
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <div className="text-center mb-8">
              <h2 className="text-petroleum font-bold text-lg md:text-2xl uppercase tracking-[0.2em] italic">
                Especificações Técnicas
              </h2>
              <p className="text-[10px] text-slate-400 md:hidden mt-2 italic">
                Role para o lado para ver todos os planos →
              </p>
            </div>

            <div className="rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[800px] md:min-w-[1000px]">
                  {/* ... Cabeçalho e Corpo da Tabela mantidos com as variáveis de termos ... */}
                  <thead>
                    <tr className="bg-petroleum">
                      <th className="p-6 text-[10px] font-semibold uppercase tracking-widest text-gold/80">
                        Recursos
                      </th>
                      {Object.keys(segmentPlans).map((key) => (
                        <th key={key} className="p-6 text-center">
                          <span className="text-[11px] text-white font-semibold uppercase tracking-widest">
                            {
                              segmentPlans[key as keyof typeof segmentPlans]
                                .name
                            }
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
          <div className="flex flex-col md:flex-row items-center gap-3 bg-petroleum/5 border border-petroleum/10 px-6 py-4 rounded-2xl md:rounded-full w-fit mx-auto mt-12">
            <ShieldCheck size={18} className="text-gold" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-petroleum/70 text-center">
              Pagamento Seguro • {new Date().getFullYear()} • SSL 256-bits
            </span>
          </div>
        </section>
      </main>
    </EditorialView>
  );
}
