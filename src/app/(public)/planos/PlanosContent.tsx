'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  X,
  Loader2,
  ChevronDown,
  Images,
  FolderOpen,
  HardDrive,
  Users,
  FileArchive,
  Link as LinkIcon,
  ShieldCheck,
} from 'lucide-react';
import EditorialCard from '@/components/ui/EditorialCard';
import EditorialView from '@/components/layout/EditorialView';
import {
  COMMON_FEATURES,
  PlanKey,
  PERMISSIONS_BY_PLAN,
  PlanPermissions,
  SegmentType,
  PLANS_BY_SEGMENT,
  formatPhotoCredits,
} from '@/core/config/plans';
import { useSegment } from '@/hooks/useSegment';
import FeaturePreview from '@/components/ui/FeaturePreview';

export default function PlanosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [billingCycle, setBillingCycle] = useState<
    'monthly' | 'semester' | 'annual'
  >('monthly');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const { segment, terms } = useSegment();

  const groups = useMemo(
    () =>
      Array.from(
        new Set(COMMON_FEATURES.map((f) => f.group.trim().toUpperCase())),
      ),
    [],
  );

  useEffect(() => {
    setMounted(true);
    setExpandedGroups(Object.fromEntries(groups.map((g) => [g, true])));
  }, [groups]);

  if (!mounted) return null;

  const segmentPlans = PLANS_BY_SEGMENT[segment as SegmentType];
  const planosKeys = Object.keys(segmentPlans) as PlanKey[];

  const toggleGroup = (name: string) =>
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));

  // Lê o array values da tabela pelo índice — fonte única de verdade para a tabela
  const getFeatureValue = (label: string, planIdx: number) => {
    const feature = COMMON_FEATURES.find((f) => f.label === label);
    if (!feature) return '—';
    const val = feature.values?.[planIdx];
    if (val === undefined) return '—';
    return val; // true | false | string
  };

  return (
    <EditorialView
      title="Planos"
      subtitle={`A estrutura definitiva para sua entrega como ${terms.singular}.`}
    >
      <main className="w-full -mt-4 md:-mt-8">
        {/* ── SELETOR DE PERÍODO ── */}
        <div className="flex items-center gap-1.5 mb-10 bg-slate-50 p-1.5 rounded-full border border-slate-200 shadow-sm w-fit mx-auto">
          {(
            [
              { value: 'monthly', label: 'Mensal', badge: null },
              { value: 'semester', label: 'Semestral', badge: '-12%' },
              { value: 'annual', label: 'Anual', badge: '-20%' },
            ] as const
          ).map(({ value, label, badge }) => (
            <button
              key={value}
              onClick={() => setBillingCycle(value)}
              className={`relative py-2 px-4 md:px-5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                billingCycle === value
                  ? 'bg-petroleum text-white shadow-md'
                  : 'text-petroleum/40 hover:text-petroleum/70'
              }`}
            >
              {label}
              {badge && (
                <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── GRID DE CARDS ── */}
        <section className="max-w-[1650px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mb-12">
            {planosKeys.map((key) => {
              const planInfo = segmentPlans[key];
              const perms = PERMISSIONS_BY_PLAN[key];
              const isPro = key === 'PRO';
              const displayPrice =
                billingCycle === 'annual'
                  ? planInfo.yearlyPrice
                  : billingCycle === 'semester'
                    ? planInfo.semesterPrice
                    : planInfo.price;

              // Indicadores lidos direto das permissions — sem depender da tabela
              const indicators: Array<{
                icon: React.ReactElement;
                label: string;
                value: string;
                permKey?: keyof PlanPermissions;
              }> = [
                {
                  icon: <Images />,
                  label: 'Créditos de fotos',
                  value: formatPhotoCredits(perms.photoCredits),
                  permKey: 'photoCredits',
                },
                {
                  icon: <FolderOpen />,
                  label: 'Galerias ativas',
                  value: `${perms.maxGalleries} galerias`,
                  permKey: 'maxGalleries',
                },
                {
                  icon: <HardDrive />,
                  label: `Fotos por ${terms.item}`,
                  value: `até ${perms.maxPhotosPerGallery}`,
                  permKey: 'maxPhotosPerGallery',
                },
                {
                  icon: <Users />,
                  label: 'Visitantes',
                  value: perms.canCaptureLeads
                    ? 'Cadastro de visitantes'
                    : 'Acesso Livre',
                  permKey: 'canCaptureLeads',
                },
                {
                  icon: <FileArchive />,
                  label: 'Resolução ZIP',
                  value: perms.zipSizeLimit,
                  permKey: 'zipSizeLimit',
                },
                {
                  icon: <LinkIcon />,
                  label: 'Links externos',
                  value:
                    perms.maxExternalLinks === 0
                      ? 'Nenhum'
                      : `${perms.maxExternalLinks} ${perms.maxExternalLinks === 1 ? 'link' : 'links'}`,
                  permKey: 'maxExternalLinks',
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
                  {/* Preço */}
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
                      {billingCycle === 'annual'
                        ? 'Equivalente / mês'
                        : billingCycle === 'semester'
                          ? 'Equivalente / mês'
                          : 'Cobrança mensal'}
                    </p>
                  </div>

                  {/* Indicadores */}
                  <div className="space-y-4 mb-8 flex-grow">
                    {indicators.map((ind, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-gold">
                          {React.cloneElement(ind.icon, {
                            size: 16,
                            strokeWidth: 2,
                          })}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-semibold text-petroleum leading-tight">
                            {ind.value}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-petroleum/70 font-semibold uppercase tracking-widest">
                              {ind.label}
                            </span>
                            {ind.permKey && (
                              <FeaturePreview
                                featureKey={ind.permKey}
                                align={i > 2 ? 'right' : 'left'}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
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

        {/* ── TABELA TÉCNICA ── */}
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
                    <th className="px-7 py-5 text-[11px] font-semibold uppercase tracking-widest text-champagne border-b border-white/5 sticky left-0 z-50 bg-petroleum">
                      Recursos
                    </th>
                    {planosKeys.map((key) => {
                      const planInfo = segmentPlans[key];
                      const displayPrice =
                        billingCycle === 'annual'
                          ? planInfo.yearlyPrice
                          : billingCycle === 'semester'
                            ? planInfo.semesterPrice
                            : planInfo.price;
                      return (
                        <th key={key} className="p-6 border-b border-white/5">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-champagne">
                                <planInfo.icon size={18} strokeWidth={2} />
                              </div>
                              <span className="text-[11px] text-white font-bold uppercase tracking-widest whitespace-nowrap">
                                {planInfo.name}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[9px] font-medium text-gold">
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
                      {/* Cabeçalho de grupo colapsável */}
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
                              className={`text-gold transition-transform duration-300 ${
                                expandedGroups[groupName] ? '' : '-rotate-90'
                              }`}
                            />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gold">
                              {groupName}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Linhas de features */}
                      {expandedGroups[groupName] &&
                        COMMON_FEATURES.filter(
                          (f) => f.group.trim().toUpperCase() === groupName,
                        ).map((feature, fIdx) => (
                          <tr
                            key={`${groupName}-${fIdx}`}
                            className="hover:bg-slate-50 transition-colors group"
                          >
                            {/* Label + tooltip */}
                            <td className="py-4 px-8 border-b border-slate-100 bg-white sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-semibold text-petroleum opacity-80 group-hover:opacity-100">
                                  {feature.label}
                                </span>
                                {feature.key && (
                                  <FeaturePreview
                                    featureKey={
                                      feature.key as keyof PlanPermissions
                                    }
                                    align="left"
                                  />
                                )}
                              </div>
                            </td>

                            {/* Valores por plano */}
                            {planosKeys.map((key, pIdx) => {
                              const val = getFeatureValue(feature.label, pIdx);
                              return (
                                <td
                                  key={`${key}-${fIdx}`}
                                  className="py-4 px-4 border-b border-slate-100 text-center"
                                >
                                  <div className="flex items-center justify-center">
                                    {val === true ? (
                                      <Check
                                        size={18}
                                        className="text-emerald-600"
                                        strokeWidth={3}
                                      />
                                    ) : val === false ? (
                                      <X
                                        size={16}
                                        className="text-slate-300"
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

          {/* Badge de segurança */}
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
