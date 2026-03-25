'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  BarChart2,
  Bell,
  Shield,
  UserRound,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@photos/core-auth';
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
  PIX_DISCOUNT_PERCENT,
} from '@/core/config/plans';
import { useSegment } from '@/hooks/useSegment';
import FeaturePreview from '@/components/ui/FeaturePreview';
import BaseModal from '@/components/ui/BaseModal';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

const OPEN_UPGRADE_KEY = 'openUpgrade';

export default function PlanosContent() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [billingCycle, setBillingCycle] = useState<
    'monthly' | 'semester' | 'annual'
  >('monthly');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [loginRequiredModalOpen, setLoginRequiredModalOpen] = useState(false);
  const [pendingPlanKey, setPendingPlanKey] = useState<PlanKey | null>(null);

  const { segment, terms } = useSegment();

  const handlePlanCta = (key: PlanKey) => {
    if (authLoading) return;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(OPEN_UPGRADE_KEY, key);
      } catch {
        // ignore
      }
    }
    setLoadingPlan(key);
    if (user) {
      router.push('/dashboard');
    } else {
      setPendingPlanKey(key);
      setLoginRequiredModalOpen(true);
    }
  };

  const closeLoginRequiredModal = () => {
    setLoginRequiredModalOpen(false);
    setPendingPlanKey(null);
    setLoadingPlan(null);
  };

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

  const getFeatureValue = (label: string, planIdx: number) => {
    const feature = COMMON_FEATURES.find((f) => f.label === label);
    if (!feature) return '—';
    const val = feature.values?.[planIdx];
    if (val === undefined) return '—';
    return val;
  };

  return (
    <EditorialView
      title="Planos"
      subtitle={`A estrutura definitiva para sua entrega como ${terms.singular}.`}
    >
      <main className="w-full -mt-4 md:-mt-8">
        {/* ── SELETOR DE PERÍODO ── */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-full border border-slate-200 shadow-sm w-fit mx-auto">
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
          {(billingCycle === 'semester' || billingCycle === 'annual') && (
            <p className="text-[10px] font-semibold text-petroleum/80 text-center max-w-md">
              <span className="text-emerald-600 font-bold">
                +{PIX_DISCOUNT_PERCENT}% OFF
              </span>{' '}
              no pagamento com PIX
            </p>
          )}
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

              const indicators: Array<{
                icon: React.ReactElement;
                label: string;
                value: string;
                permKey?: keyof PlanPermissions;
              }> = [
                {
                  icon: <Images />,
                  label: 'Cota de fotos/vídeos',
                  value: formatPhotoCredits(perms.photoCredits),
                  permKey: 'photoCredits',
                },
                {
                  icon: <FolderOpen />,
                  label: 'Galerias ativas',
                  value: `Até ${perms.maxGalleriesHardCap} galerias`,
                  permKey: 'maxGalleries',
                },
                {
                  icon: <HardDrive />,
                  label: 'Arquivos/galeria',
                  value: `até ${perms.maxPhotosPerGallery}`,
                  permKey: 'maxPhotosPerGallery',
                },
                {
                  icon: <BarChart2 />,
                  label: 'Estatísticas',
                  value: perms.canAccessStats ? 'Ativadas' : 'Não',
                  permKey: 'canAccessStats',
                },
                {
                  icon: <Bell />,
                  label: 'Notificações',
                  value: perms.canAccessNotifyEvents ? 'Ativadas' : 'Não',
                  permKey: 'canAccessNotifyEvents',
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
              ];

              return (
                <EditorialCard
                  key={key}
                  title={planInfo.name}
                  icon={<planInfo.icon size={32} strokeWidth={1.5} />}
                  accentColor={isPro ? 'gold' : 'petroleum'}
                  badge={isPro ? 'Mais Escolhido' : undefined}
                >
                  <div className="text-center mb-3">
                    <div className="flex items-start justify-center gap-1 text-petroleum">
                      <span className="text-[14px] font-semibold mt-2 text-gold">
                        R$
                      </span>
                      <span className="text-5xl font-semibold tracking-tighter italic">
                        {displayPrice.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[9px] font-semibold text-petroleum/70 uppercase tracking-widest mt-0.5">
                      {billingCycle === 'annual'
                        ? 'Equivalente / mês'
                        : billingCycle === 'semester'
                          ? 'Equivalente / mês'
                          : 'Cobrança mensal'}
                    </p>
                  </div>

                  <div className="space-y-2.5 mb-5 flex-grow">
                    {indicators.map((ind, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-gold [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:stroke-[2]">
                          {ind.icon}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-petroleum leading-tight">
                            {ind.value}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-petroleum/70 font-semibold uppercase tracking-widest">
                              {ind.label}
                            </span>
                            {ind.permKey && (
                              <FeaturePreview featureKey={ind.permKey} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePlanCta(key)}
                    disabled={!!loadingPlan || authLoading}
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
                              size={16}
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

                      {expandedGroups[groupName] &&
                        COMMON_FEATURES.filter(
                          (f) => f.group.trim().toUpperCase() === groupName,
                        ).map((feature, fIdx) => (
                          <tr
                            key={`${groupName}-${fIdx}`}
                            className="hover:bg-slate-50 transition-colors group"
                          >
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
                                  />
                                )}
                              </div>
                            </td>
                            {planosKeys.map((key, pIdx) => {
                              const val = getFeatureValue(feature.label, pIdx);
                              const isLastColumn =
                                pIdx === planosKeys.length - 1;
                              return (
                                <td
                                  key={`${key}-${fIdx}`}
                                  className="py-4 px-4 border-b border-slate-100 text-center"
                                >
                                  <div className="flex items-center justify-center gap-1.5">
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

          <div className="flex flex-col md:flex-row items-center gap-3 bg-petroleum/5 border border-petroleum/10 px-6 py-4 rounded-2xl md:rounded-full w-fit mx-auto mt-12">
            <ShieldCheck size={18} className="text-gold" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-petroleum/70 text-center">
              Pagamento Seguro • {new Date().getFullYear()} • SSL 256-bits
            </span>
          </div>
        </section>
      </main>

      <BaseModal
        isOpen={loginRequiredModalOpen}
        onClose={closeLoginRequiredModal}
        title="Identificação"
        subtitle="Acesse seu painel profissional"
        maxWidth="lg"
        headerIcon={
          <div className="shrink-0 p-2.5 rounded-luxury bg-gold/10 border border-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <UserRound size={22} strokeWidth={2.5} className="text-gold" />
          </div>
        }
        footer={
          <div className="flex flex-col gap-4 w-full px-2 items-center">
            <GoogleSignInButton variant="full" />
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100">
              <Shield size={10} className="text-emerald-500/70" />
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                Ambiente Seguro • Criptografia SSL 256-bit
              </p>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-6 py-2">
          <div className="relative overflow-hidden bg-slate-50/60 p-3 rounded-2xl border border-slate-100 flex items-start gap-3 text-left">
            <div className="absolute top-0 left-0 w-1 h-full bg-gold/30 rounded-l" />
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mt-1.5">
              <Sparkles size={18} strokeWidth={2} className="text-gold" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[13px] md:text-[14px] leading-relaxed text-petroleum/85 font-medium">
                Utilize sua conta Google para gerenciar suas galerias e
                conteúdos profissionais com segurança total.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-1">
            <div className="flex items-start gap-4 group">
              <div className="w-8 h-8 rounded-full bg-petroleum text-gold flex items-center justify-center shrink-0 font-semibold text-[12px] border-2 border-gold/20 shadow-sm transition-transform group-hover:scale-105 mt-1.5">
                1
              </div>
              <p className="text-[13px] text-petroleum/75 leading-relaxed">
                Para contratar o plano{' '}
                {pendingPlanKey && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gold/10 text-petroleum font-semibold text-[11px] uppercase tracking-tighter border border-gold/20">
                    {segmentPlans?.[pendingPlanKey]?.name ?? pendingPlanKey}
                  </span>
                )}
                , use o botão &quot;Entrar com Google&quot; abaixo.
              </p>
            </div>
            <div className="flex items-start gap-4 group">
              <div className="w-8 h-8 rounded-full bg-petroleum text-gold flex items-center justify-center shrink-0 font-semibold text-[12px] border-2 border-gold/20 shadow-sm transition-transform group-hover:scale-105 mt-1.5">
                2
              </div>
              <p className="text-[13px] text-petroleum/75 leading-relaxed pt-1.5">
                Em seguida você acessa o{' '}
                <strong className="text-petroleum font-semibold tracking-[0.02em]">
                  Espaço de Galerias
                </strong>{' '}
                para finalizar a assinatura e começar a usar.
              </p>
            </div>
          </div>
        </div>
      </BaseModal>
    </EditorialView>
  );
}
