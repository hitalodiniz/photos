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
  FEATURE_DESCRIPTIONS,
} from '@/core/config/plans';

import { useSegment } from '@/hooks/useSegment';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export default function PlanosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const { segment, terms } = useSegment();

  // 1. Grupos normalizados para evitar erro de comparação
  const groups = useMemo(() => {
    return Array.from(
      new Set(COMMON_FEATURES.map((f) => f.group.trim().toUpperCase())),
    );
  }, []);

  useEffect(() => {
    setMounted(true);
    // Inicializa todos os grupos como abertos
    setExpandedGroups(Object.fromEntries(groups.map((g) => [g, true])));
  }, [groups]);

  if (!mounted) return null;

  const segmentPlans =
    PLANS_BY_SEGMENT[segment as keyof typeof PLANS_BY_SEGMENT];
  const planosKeys = Object.keys(segmentPlans) as PlanKey[];

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

    // 🎯 Prioridade: Se existir um array de valores amigáveis (values),
    // exibimos o texto correspondente ao índice do plano.
    if (feature.values && feature.values[planIdx] !== undefined) {
      const val = feature.values[planIdx];
      if (val === true) return true; // Para renderizar o ícone de Check
      if (val === false) return false; // Para renderizar o ícone de X
      return val;
    }

    // Fallback para valores brutos das permissões (apenas se não houver 'values' amigáveis)
    if (feature.key) {
      const val =
        PERMISSIONS_BY_PLAN[planKey][feature.key as keyof PlanPermissions];
      return val === 9999 ? 'Ilimitado' : val;
    }

    return '—';
  };

  return (
    <EditorialView
      title="Planos"
      subtitle={`A estrutura definitiva para sua entrega como ${terms.singular}.`}
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

        {/* GRID DE CARDS SUPERIORES */}
        <section className="max-w-[1650px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mb-12">
            {planosKeys.map((key, idx) => {
              const planInfo = segmentPlans[key];
              const isPro = key === 'PRO';
              const displayPrice = isAnnual
                ? planInfo.yearlyPrice
                : planInfo.price;

              const indicators = [
                {
                  icon: <ImageIcon />,
                  label: `Galerias ativas`,
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
                  label: `Capacidade por ${terms.item}`,
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
                    {indicators.map((ind, i) => {
                      const featureConfig = COMMON_FEATURES.find(
                        (f) => f.label === ind.label,
                      );
                      const description = featureConfig?.key
                        ? FEATURE_DESCRIPTIONS[
                            featureConfig.key as keyof PlanPermissions
                          ]
                        : null;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-gold">
                            {React.cloneElement(ind.icon as any, {
                              size: 16,
                              strokeWidth: 2,
                            })}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] font-semibold text-petroleum leading-tight">
                                {ind.value}
                              </span>
                              {description && (
                                <InfoTooltip
                                  title={description.label}
                                  content={description.description}
                                />
                              )}
                            </div>
                            <span className="text-[10px] text-petroleum/70 font-medium uppercase tracking-normal">
                              {ind.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setLoadingPlan(key)}
                    disabled={!!loadingPlan}
                    className={`w-full h-12 flex items-center justify-center gap-3 rounded-xl transition-all font-semibold text-[10px] uppercase tracking-widest ${
                      isPro
                        ? 'bg-petroleum text-white shadow-xl hover:bg-black'
                        : 'bg-white border border-petroleum/20 text-petroleum'
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

        {/* TABELA TÉCNICA */}
        <section className="max-w-[1650px] mx-auto px-4 md:px-6">
          <div className="text-center mb-8">
            <h2 className="text-petroleum font-bold text-lg md:text-2xl uppercase tracking-[0.2em] italic">
              Especificações Técnicas
            </h2>
          </div>

          <div className="rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-petroleum">
                    <th className="px-7 text-[11px] font-semibold uppercase tracking-widest text-champagne border-b border-white/5">
                      Recursos
                    </th>
                    {planosKeys.map((key) => {
                      const planInfo = segmentPlans[key];
                      const displayPrice = isAnnual
                        ? planInfo.yearlyPrice
                        : planInfo.price;

                      return (
                        <th key={key} className="p-6 border-b border-white/5">
                          <div className="flex flex-col items-center gap-1">
                            {/* Linha Horizontal: Ícone + Nome */}
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-champagne">
                                <planInfo.icon size={18} strokeWidth={2} />
                              </div>
                              <span className="text-[11px] text-white font-bold uppercase tracking-widest whitespace-nowrap">
                                {planInfo.name}
                              </span>
                            </div>

                            {/* Preço do Plano */}
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[9px] font-medium champagne">
                                R$
                              </span>
                              <span className="text-xl font-semibold text-white tracking-tighter italic">
                                {displayPrice.toFixed(0)}
                              </span>
                              <span className="text-[8px] text-white/80 font-medium lowercase ml-0.5">
                                /mês
                              </span>
                            </div>
                          </div>
                        </th>
                      );
                    })}
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
                          colSpan={planosKeys.length + 1}
                          className="py-4 px-8 border-b border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronDown
                              size={14}
                              strokeWidth={2.5}
                              className={`text-gold transition-transform duration-500 ${expandedGroups[groupName] ? '' : '-rotate-90'}`}
                            />
                            <span className="text-[10px] font-bold uppercase tracking-luxury-widest text-gold">
                              {groupName}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {expandedGroups[groupName] &&
                        COMMON_FEATURES.filter(
                          (f) => f.group.trim().toUpperCase() === groupName,
                        ).map((feature, fIdx) => (
                          <tr
                            key={`${groupName}-${fIdx}`}
                            className="hover:bg-slate-50 transition-colors group"
                          >
                            <td className="py-4 px-8 border-b border-slate-100 bg-white sticky left-0 z-30 text-[12px] font-semibold text-petroleum">
                              <div className="flex items-center gap-2">
                                {feature.label}
                                {feature.key &&
                                  FEATURE_DESCRIPTIONS[
                                    feature.key as keyof PlanPermissions
                                  ] && (
                                    <InfoTooltip
                                      title={
                                        FEATURE_DESCRIPTIONS[
                                          feature.key as keyof PlanPermissions
                                        ].label
                                      }
                                      content={
                                        FEATURE_DESCRIPTIONS[
                                          feature.key as keyof PlanPermissions
                                        ].description
                                      }
                                      align="left"
                                    />
                                  )}
                              </div>
                            </td>
                            {planosKeys.map((key, pIdx) => {
                              const val = getFeatureValue(
                                feature.label,
                                key,
                                pIdx,
                              );
                              return (
                                <td
                                  key={`${key}-${fIdx}`}
                                  className="py-4 px-4 border-b border-slate-100 text-center"
                                >
                                  <div className="flex items-center justify-center">
                                    {val === true ? (
                                      <Check
                                        size={18}
                                        className="text-emerald"
                                        strokeWidth={3}
                                      />
                                    ) : val === false ? (
                                      <X
                                        size={16}
                                        className="text-slate-600"
                                        strokeWidth={2}
                                      />
                                    ) : (
                                      <span className="text-[12px] font-medium text-petroleum">
                                        {val}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
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
