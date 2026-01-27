'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  X,
  Lock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Users,
  FileArchive,
  Link as LinkIcon,
} from 'lucide-react';
import {
  EditorialHeader,
  DynamicHeroBackground,
  Footer,
} from '@/components/layout';
import EditorialCard from '@/components/ui/EditorialCard';
import {
  getPlansByDomain,
  COMMON_FEATURES,
  PlanKey,
  PERMISSIONS_BY_PLAN,
  PlanPermissions,
} from '@/core/config/plans';

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
      className={`relative min-h-screen w-full flex flex-col theme-${config.theme} font-montserrat bg-black`}
    >
      <DynamicHeroBackground />
      <div className="fixed inset-0 z-0 from-petroleum/40 via-petroleum/95 to-petroleum z-[1]" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <EditorialHeader
          title={`Investimento ${config.name}`}
          subtitle="A estrutura definitiva para sua entrega profissional."
        />

        <main className="flex-grow py-12 px-6 max-w-[1650px] mx-auto w-full">
          {/* CARDS SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-24 items-stretch">
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
                  label: 'Captação de leads',
                  value:
                    getFeatureValue('Formulário de Acesso', key, idx) === false
                      ? false
                      : 'Liberado',
                },
                {
                  icon: <FileArchive />,
                  label: 'Qualidade download',
                  value: getFeatureValue('Download ZIP', key, idx),
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
                    <div className="flex items-start justify-center gap-1 text-petroleum">
                      <span className="text-[16px] font-semibold mt-2">R$</span>
                      <span className="text-6xl font-semibold tracking-tighter italic">
                        {plan.price.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-petroleum/40 tracking-widest uppercase mt-1">
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
                              className={`text-[13px] font-semibold leading-tight ${isLocked ? 'italic text-petroleum/60' : 'text-petroleum'}`}
                            >
                              {isLocked ? 'Não disponível' : ind.value}
                            </span>
                            <span className="text-[11px] text-petroleum/50 font-medium leading-tight">
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
          <div className="text-center mb-10">
            <h2 className="text-white font-light text-3xl uppercase tracking-[0.4em] mb-4">
              Especificações Técnicas
            </h2>
            <div className="w-20 h-px bg-gold mx-auto opacity-60" />
          </div>

          <div className="rounded-luxury overflow-hidden border border-white/10 shadow-2xl bg-white mb-20">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-petroleum/95">
                    <th className="p-5 sticky left-0 z-50 bg-petroleum border-b border-white/10">
                      <span className="text-[12px] font-semibold uppercase tracking-widest text-gold">
                        Recurso
                      </span>
                    </th>
                    {planosKeys.map((key) => (
                      <th
                        key={key}
                        className="p-5 text-center border-b border-white/10"
                      >
                        <span className="text-[13px] text-white font-semibold tracking-wide block">
                          {currentPlans[key].name}
                        </span>
                        <span className="text-[11px] text-gold/60 font-semibold uppercase tracking-tight">
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
                          className="cursor-pointer bg-slate-50"
                          onClick={() =>
                            setExpandedGroups((prev) =>
                              prev.includes(groupName)
                                ? prev.filter((g) => g !== groupName)
                                : [...prev, groupName],
                            )
                          }
                        >
                          <td
                            colSpan={6}
                            className="py-4 px-6 border-b border-slate-200"
                          >
                            <div className="flex items-center gap-3 text-petroleum">
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
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
                              <td className="py-4 px-8 border-b border-slate-100 bg-white sticky left-0 z-30 text-[13px] font-medium text-petroleum/80">
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
                                          className={`text-[13px] font-medium text-petroleum ${isLocked ? 'italic' : ''}`}
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
