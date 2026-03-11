'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Menu,
  Sparkles,
  Clock,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  ZapOff,
  Star,
  Crown,
  User,
} from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';

import { useAuth } from '@photos/core-auth';
import { UserMenu } from '@/components/auth';
import AdminControlModal from '@/components/admin/AdminControlModal';
import { useSidebar } from '@/components/providers/SidebarProvider';
import { useSegment } from '@/hooks/useSegment';
import { NotificationMenu } from '../dashboard/NotificationMenu';
import { UpgradeSheet } from '@/components/ui/Upgradesheet';
import { usePlan } from '@/core/context/PlanContext';
import {
  getProOnlyFeatureLabels,
  MAX_GALLERIES_HARD_CAP_BY_PLAN,
  PHOTO_CREDITS_BY_PLAN,
} from '@/core/config/plans';
import type { PlanKey } from '@/core/config/plans';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { SegmentIcon } = useSegment();
  const { user, avatarUrl, isLoading } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);
  const [upgradeSheetInitialPlan, setUpgradeSheetInitialPlan] = useState<
    PlanKey | undefined
  >(undefined);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const trialRef = useRef<HTMLDivElement>(null);

  const plan = usePlan();
  const isTrial = plan.planKey === 'PRO' && plan.permissions.isTrial;
  const isProfileComplete = Boolean(
    plan.profile?.full_name && plan.profile?.username,
  );
  const proFeatureLabels = useMemo(() => getProOnlyFeatureLabels(), []);
  const trialDaysLeft = plan.trialExpiresAt
    ? Math.max(
        0,
        differenceInCalendarDays(parseISO(plan.trialExpiresAt), new Date()),
      )
    : 0;

  useEffect(() => setMounted(true), []);

  // Abrir UpgradeSheet com plano pré-selecionado ao vir da página de planos (sessionStorage)
  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) return;
    try {
      const stored = sessionStorage.getItem('openUpgrade');
      if (!stored || !isProfileComplete) return;
      const planKeys: PlanKey[] = ['FREE', 'START', 'PLUS', 'PRO', 'PREMIUM'];
      if (planKeys.includes(stored as PlanKey)) {
        setUpgradeSheetInitialPlan(stored as PlanKey);
        setUpgradeSheetOpen(true);
      }
      sessionStorage.removeItem('openUpgrade');
    } catch {
      // ignore
    }
  }, [pathname]);

  useEffect(() => {
    if (!trialOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (trialRef.current && !trialRef.current.contains(e.target as Node)) {
        setTrialOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [trialOpen]);

  // 🎯 Mapeamento de Títulos Dinâmicos (Editorial)
  const pageTitle = useMemo(() => {
    if (pathname === '/onboarding') return 'Editar Perfil';
    if (pathname.includes('/settings/messages')) return 'Configurar Mensagens';
    if (pathname.includes('/settings')) return 'Preferências';
    if (pathname.includes('/edit')) return 'Editar Galeria';
    if (pathname.includes('/tags')) return 'Marcações';
    if (pathname.includes('/leads'))
      return 'Relatório de Cadastro de Visitantes';
    if (pathname.includes('/new')) return 'Nova Galeria';
    if (pathname.includes('/stats')) return 'Estatísticas da galeria';
    if (pathname.includes('/assinatura')) return 'Minha assinatura';
    return null;
  }, [pathname]);

  const showNavbar =
    mounted &&
    user &&
    !isLoading &&
    (pathname === '/dashboard' ||
      pathname === '/onboarding' ||
      pathname.includes('/dashboard/'));

  if (!showNavbar) return null;

  const isFormPage = !!pageTitle;

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-[110] h-12 glass-surface border-b border-white/5 shadow-xl transition-all duration-300">
        <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between px-4 md:px-8">
          {/* Lado Esquerdo: Branding & Navegação */}
          <div className="flex items-center  overflow-hidden">
            {/* Botão Menu Mobile (Apenas Home Dashboard) */}
            {pathname === '/dashboard' && (
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 text-white/50 hover:text-champagne transition-colors"
                aria-label="Abrir Menu"
              >
                <Menu size={20} />
              </button>
            )}

            {/* Botão Voltar (Páginas Internas) */}
            {isFormPage && (
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-white/70 hover:text-champagne hover:bg-white/5 rounded-full transition-all shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <div className="flex items-center gap-3">
              <a
                href="/dashboard"
                className="flex items-center gap-2 group shrink-0"
              >
                <SegmentIcon
                  className="text-champagne w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:rotate-12"
                  strokeWidth={1.2}
                />
                <h1 className="hidden sm:block text-[15px] md:text-sm font-semibold tracking-[0.05em] text-white uppercase">
                  Espaço das <span className="text-champagne">Galerias</span>
                </h1>
              </a>

              {/* Título Dinâmico (Estilo Breadcrumb Minimalista) */}
              {isFormPage && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-500">
                  <span className="w-px h-4 bg-white/20" />
                  <span className="text-xs md:text-sm font-medium tracking-widest text-white/90 uppercase whitespace-nowrap">
                    {pageTitle}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: User Actions */}
          <div className="flex items-center gap-4">
            {/* Trial: chip compacto que expande ao clicar */}
            {isTrial && trialDaysLeft >= 0 && (
              <div className="relative" ref={trialRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTrialOpen((o) => !o);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-champagne/10 text-champagne 
                  hover:bg-champagne/20 transition-colors text-[11px] font-medium uppercase tracking-wide"
                >
                  <Sparkles size={12} className="text-gold shrink-0" />
                  <span>Teste</span>
                  <span className="text-champagne font-semibold">
                    · {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-champagne/80 shrink-0 transition-transform ${trialOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {trialOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setTrialOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 mt-3 w-[480px] bg-petroleum border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      {/* Header — mesmo padrão do NotificationMenu */}
                      <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center gap-3">
                        <div className="p-2 rounded-luxury bg-champagne text-petroleum">
                          <Clock size={18} className="animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[12px] font-bold text-white/90 uppercase tracking-widest leading-none">
                            TESTE PLANO PRO
                          </p>
                          <span className="text-[11px] text-white/80 font-medium mt-1">
                            {trialDaysLeft}{' '}
                            {trialDaysLeft === 1
                              ? 'dia restante'
                              : 'dias restantes'}
                          </span>
                        </div>
                      </div>

                      {/* Conteúdo — bg-white e texto petroleum como no NotificationMenu */}
                      <div className="max-h-[480px] overflow-y-auto custom-scrollbar bg-white">
                        <div className="p-5 space-y-2">
                          <p className="text-[10px] font-bold text-petroleum uppercase tracking-widest">
                            Atenção ao Downgrade Automático após expiração do
                            teste
                          </p>
                          <div className="space-y-3">
                            <div className="flex gap-3 items-start">
                              <ShieldAlert
                                size={14}
                                className="text-gold shrink-0 mt-0.5"
                              />
                              <p className="text-[12px] text-petroleum/80 leading-relaxed font-medium">
                                Galerias e arquivos que excederem o limite{' '}
                                <strong className="text-petroleum">
                                  FREE ({MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE}{' '}
                                  galerias / {PHOTO_CREDITS_BY_PLAN.FREE} fotos)
                                </strong>{' '}
                                serão arquivados e sairão do ar.
                              </p>
                            </div>
                            <div className="flex gap-3 items-start">
                              <ZapOff
                                size={14}
                                className="text-gold shrink-0 mt-0.5"
                              />
                              <p className="text-[12px] text-petroleum/80 leading-relaxed font-medium">
                                Recursos como{' '}
                                <strong className="text-petroleum">
                                  {proFeatureLabels.length > 0
                                    ? proFeatureLabels.length <= 4
                                      ? proFeatureLabels.join(', ')
                                      : `${proFeatureLabels.slice(0, 3).join(', ')} e mais`
                                    : 'Perfil Profissional, Estatísticas e mais'}
                                </strong>{' '}
                                serão desabilitados após a expiração do período
                                de teste.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer — mesmo padrão do NotificationMenu */}
                      <div className="p-4 bg-white/5 border-t border-white/5 flex flex-col gap-2">
                        {!isProfileComplete && (
                          <p className="text-[11px] text-white font-medium text-center">
                            Preencha seu perfil para assinar o plano PRO.
                          </p>
                        )}
                        {/* CTA Principal — destacado (desabilitado se perfil incompleto) */}
                        <button
                          type="button"
                          disabled={!isProfileComplete}
                          onClick={() => {
                            if (!isProfileComplete) return;
                            setTrialOpen(false);
                            setUpgradeSheetInitialPlan('PRO');
                            setUpgradeSheetOpen(true);
                          }}
                          className="btn-luxury-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none"
                        >
                          <Crown size={20} className="" />
                          Manter meu plano PRO
                          <ArrowRight size={14} />
                        </button>

                        {/* Frase de urgência */}
                        <p className="text-center text-[9px] text-white/70 uppercase tracking-widest">
                          Evite a interrupção das suas entregas
                        </p>

                        {/* CTA Secundário — discreto, só texto */}
                        <button
                          type="button"
                          onClick={() => {
                            setTrialOpen(false);
                            window.open('/planos', '_blank');
                          }}
                          className="w-full py-1.5 text-white/70 hover:text-white/70 text-[9px] font-medium uppercase tracking-widest transition-colors"
                        >
                          Ver outros planos
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {user && <NotificationMenu userId={user.id} />}
            <UserMenu
              session={user}
              avatarUrl={avatarUrl}
              profile={plan.profile}
              planKey={plan.planKey as PlanKey}
              planName={plan.planInfo?.name}
              onOpenAdminModal={() => setAdminModalOpen(true)}
            />
          </div>
        </div>
      </nav>

      {/* Spacer exato para a altura h-14 */}
      <div className="h-14 w-full print:hidden" />

      <AdminControlModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      <UpgradeSheet
        isOpen={upgradeSheetOpen}
        onClose={() => {
          setUpgradeSheetOpen(false);
          setUpgradeSheetInitialPlan(undefined);
        }}
        initialPlanKey={upgradeSheetInitialPlan}
      />
    </>
  );
}
