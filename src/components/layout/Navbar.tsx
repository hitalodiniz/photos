'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Menu,
  Sparkles,
  Clock,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';

import { useAuth } from '@photos/core-auth';
import { UserMenu } from '@/components/auth';
import { useSidebar } from '@/components/providers/SidebarProvider';
import { useSegment } from '@/hooks/useSegment';
import { NotificationMenu } from '../dashboard/NotificationMenu';
import { usePlan } from '@/core/context/PlanContext';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { SegmentIcon } = useSegment();
  const { user, avatarUrl, isLoading } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const trialRef = useRef<HTMLDivElement>(null);

  const plan = usePlan();
  const isTrial = plan.planKey === 'PRO' && plan.permissions.isTrial;
  const trialDaysLeft = plan.trialExpiresAt
    ? Math.max(
        0,
        differenceInCalendarDays(parseISO(plan.trialExpiresAt), new Date()),
      )
    : 0;

  useEffect(() => setMounted(true), []);

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
                  <div className="absolute top-full right-0 mt-2 w-80 rounded-luxury border border-gold/30 bg-petroleum shadow-xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-white/10 flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-gold/20 border border-gold/40">
                        <Clock size={14} className="text-champagne" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-white">
                          Período de teste no Plano PRO
                        </p>
                        <p className="text-[10px] text-white/70">
                          {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}{' '}
                          restantes com todos os recursos
                        </p>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-[11px] text-white/90 leading-relaxed">
                        Aproveite todos os recursos de entrega, cadastro de
                        visitantes, Estatísticas e notificações de acesso à
                        galeria ilimitados.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTrialOpen(false);
                          window.open('/dashboard/planos', '_blank');
                        }}
                        className="w-full h-9 px-4 bg-champagne hover:bg-gold text-petroleum font-bold text-[10px] uppercase tracking-luxury rounded-luxury flex items-center justify-center gap-2 transition-all"
                      >
                        Garantir Plano
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {user && <NotificationMenu userId={user.id} />}
            <UserMenu session={user} avatarUrl={avatarUrl} />
          </div>
        </div>
      </nav>

      {/* Spacer exato para a altura h-14 */}
      <div className="h-14 w-full print:hidden" />
    </>
  );
}
