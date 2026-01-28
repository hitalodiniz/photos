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
} from 'lucide-react';
import { EditorialHeader, Footer } from '@/components/layout';
import EditorialCard from '@/components/ui/EditorialCard';
import {
  getPlansByDomain,
  COMMON_FEATURES,
  PlanKey,
  PERMISSIONS_BY_PLAN,
  PlanPermissions,
} from '@/core/config/plans';
import { usePageTitle } from '@/hooks';
import { title } from 'process';

export default function PlanosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['GESTÃO']);

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
  const groups = Array.from(
    new Set(COMMON_FEATURES.map((f) => f.group.toUpperCase())),
  );

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
    <div
      className={`relative min-h-screen w-full flex flex-col theme-${config.theme} font-montserrat`}
    >
      <div className="fixed inset-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title={`Investimento ${config.name}`}
          subtitle="A estrutura definitiva para sua entrega profissional."
        />

        <div className="sticky top-0 z-[10] w-full pointer-events-auto">
          <div className="w-full bg-petroleum/95 backdrop-blur-md border-b border-white/10 shadow-2xl transition-all duration-500 h-12"></div>
        </div>

        {/* 🎯 Ajuste Mobile: mt-4 no mobile e -mt-16 apenas no desktop (md) */}
        <main className="flex-grow px-4 md:px-6 max-w-[1650px] mx-auto w-full mt-4 md:-mt-16 relative z-20">
          {/* CARDS SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8 items-stretch">
            {planosKeys.map((key, idx) => {
              const plan = { ...currentPlans[key], key };
              const isPro = key === 'PRO';

              const indicators = [
                {
                  icon: <ImageIcon />,
                  label: 'Galerias ativas',
                  value: getFeatureValue('Galerias Ativas', key, idx),
                },
                {
                  icon: <Users />,
                  label: 'Cadastro de visitantes',
                  value:
                    getFeatureValue(
                      'Formulário de Acesso à galeria',
                      key,
                      idx,
                    ) === false
                      ? false
                      : 'Liberado',
                },
                {
                  icon: <FileArchive />,
                  label: 'Qualidade download por foto',
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
                  icon={<plan.icon />}
                  badge={isPro ? 'Recomendado' : undefined}
                  isHighlighted={isPro}
                >
                  <div className="text-center mb-6">
                    <div className="flex items-start justify-center gap-1 text-petroleum font-artistic">
                      <span className="text-[16px] font-semibold mt-2">R$</span>
                      <span className="text-6xl font-semibold tracking-tighter italic">
                        {plan.price.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-petroleum/90 tracking-widest uppercase mt-1">
                      Mensal
                    </p>
                  </div>

                  <div className="space-y-4 mb-8 flex-grow">
                    {indicators.map((ind, i) => {
                      const isLocked =
                        ind.value === false ||
                        String(ind.value)
                          .toLowerCase()
                          .includes('indisponível');
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-4 transition-all ${isLocked ? 'grayscale opacity-40' : ''}`}
                        >
                          <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 text-petroleum/60">
                            {React.cloneElement(
                              ind.icon as React.ReactElement,
                              { size: 18, strokeWidth: 1.5 },
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={`text-[13px] font-semibold leading-tight ${isLocked ? 'italic text-petroleum/80' : 'text-petroleum'}`}
                            >
                              {isLocked ? 'Não disponível' : ind.value}
                            </span>
                            <span className="text-[12px] text-petroleum/90 font-medium leading-tight">
                              {ind.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setLoadingPlan(key)}
                    className={`w-full h-12 flex items-center justify-center gap-3 rounded-luxury transition-all font-semibold text-[12px] uppercase tracking-widest ${
                      isPro
                        ? 'bg-gold text-petroleum hover:bg-petroleum hover:text-white'
                        : 'bg-petroleum text-white hover:bg-slate-800'
                    }`}
                  >
                    {loadingPlan === key ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <plan.icon size={16} />
                        <span>{plan.cta}</span>
                      </>
                    )}
                  </button>
                </EditorialCard>
              );
            })}
          </div>

          {/* TABLE SECTION */}
          <div className="text-center mb-6">
            <h2 className="text-petroleum font-semibold text-[20px] md:text-[24px] uppercase tracking-widest">
              Especificações Técnicas
            </h2>
            <div className="w-20 h-px bg-gold mx-auto opacity-60 mt-2" />
          </div>

          <div className="rounded-luxury overflow-hidden border border-white/10 shadow-2xl bg-white mb-20 max-w-full">
            <div className="overflow-x-auto scrollbar-hide">
              {/* 🎯 Ajuste Mobile: min-w otimizado para não achatar no mobile */}
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-petroleum/95">
                    <th className="p-4 sticky left-0 z-50 bg-petroleum border-b border-white/10">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gold">
                        Recurso
                      </span>
                    </th>
                    {planosKeys.map((key) => (
                      <th
                        key={key}
                        className="p-4 text-center border-b border-white/10"
                      >
                        <span className="text-[12px] text-white font-semibold block">
                          {currentPlans[key].name}
                        </span>
                        <span className="text-[14px] text-gold font-bold">
                          R$ {currentPlans[key].price}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((groupName) => {
                    const isExpanded = expandedGroups.includes(groupName);
                    return (
                      <React.Fragment key={groupName}>
                        <tr
                          className="cursor-pointer bg-slate-50 transition-colors hover:bg-slate-100"
                          onClick={() =>
                            setExpandedGroups((prev) =>
                              prev.includes(groupName)
                                ? prev.filter((g) => g !== groupName)
                                : [...prev, groupName],
                            )
                          }
                        >
                          {/* 🎯 FIXADO NO MOBILE: Adicionado sticky left-0 e z-40 */}
                          <td
                            colSpan={6}
                            className="py-3 px-5 border-b border-slate-200 sticky left-10 z-40 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]"
                          >
                            <div className="flex items-center gap-3 text-petroleum sticky left-10">
                              {isExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap sticky left-10">
                                {groupName}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {isExpanded &&
                          COMMON_FEATURES.filter(
                            (f) => f.group.toUpperCase() === groupName,
                          ).map((feature, fIdx) => (
                            <tr
                              key={fIdx}
                              className="hover:bg-slate-50/80 group transition-colors"
                            >
                              {/* Esta célula já estava correta, mantida para contexto */}
                              <td className="py-4 px-6 md:px-8 border-b border-slate-100 bg-white sticky left-0 z-30 text-[12px] md:text-[13px] font-medium text-petroleum/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                {feature.label}
                              </td>
                              {planosKeys.map((key, pIdx) => {
                                const val = getFeatureValue(
                                  feature.label,
                                  key,
                                  pIdx,
                                );
                                const isLocked =
                                  val === false ||
                                  (typeof val === 'string' &&
                                    val
                                      .toLowerCase()
                                      .includes('não disponível'));
                                return (
                                  <td
                                    key={key}
                                    className={`py-4 px-4 border-b border-slate-100 text-center ${key === 'PRO' ? 'bg-gold/5' : ''} ${isLocked ? 'opacity-40 grayscale' : ''}`}
                                  >
                                    <div className="flex items-center justify-center min-h-[30px]">
                                      {val === true ? (
                                        <Check
                                          size={20}
                                          className="text-emerald-600"
                                          strokeWidth={2.5}
                                        />
                                      ) : val === false ? (
                                        <X
                                          size={18}
                                          className="text-petroleum/20"
                                        />
                                      ) : (
                                        <span
                                          className={`text-[12px] md:text-[13px] font-medium text-petroleum ${isLocked ? 'italic' : ''}`}
                                        >
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
