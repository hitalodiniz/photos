'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SegmentIcon, ArrowLeft, Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@photos/core-auth';
import { UserMenu } from '@/components/auth';
import { useSidebar } from '@/components/providers/SidebarProvider';
import { useSegment } from '@/hooks/useSegment';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { SegmentIcon } = useSegment();
  const { user, avatarUrl, isLoading } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);

  // 🎯 Garante que só renderiza após montagem (evita problemas de hidratação)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🎯 DEBUG: Log para diagnóstico (sempre)
  useEffect(() => {
    if (mounted) {
      // const shouldShow = user && !isLoading && (pathname === '/dashboard' || pathname === '/onboarding' || pathname.includes('/dashboard/'));
      /* console.log('[Navbar] Debug:', {
        pathname,
        hasUser: !!user,
        user,
        isLoading,
        mounted,
        shouldShow,
        conditions: {
          hasUser: !!user,
          notLoading: !isLoading,
          isDashboard: pathname === '/dashboard',
          isOnboarding: pathname === '/onboarding',
          includesDashboard: pathname.includes('/dashboard/'),
        },
      }); */
    }
  }, [pathname, user, isLoading, mounted]);

  // Não renderiza até montar (evita flash de conteúdo)
  if (!mounted) {
    // console.log('[Navbar] Aguardando montagem...');
    return null;
  }

  const showNavbar =
    user &&
    !isLoading &&
    (pathname === '/dashboard' ||
      pathname === '/onboarding' ||
      pathname.includes('/dashboard/'));

  if (!showNavbar) {
    // 🎯 DEBUG: Log quando não mostra
    /* console.log('[Navbar] Não mostrando navbar:', {
      reason: !user ? 'sem usuário' : isLoading ? 'carregando' : 'pathname não corresponde',
      pathname,
      hasUser: !!user,
      isLoading,
    }); */
    return null;
  }

  // Detectar se está na página de criação/edição de galeria, onboarding ou preferências
  const isFormPage =
    (pathname.includes('/dashboard/galerias/') &&
      (pathname.includes('/new') ||
        pathname.includes('/edit') ||
        pathname.includes('/leads'))) ||
    pathname === '/onboarding' ||
    pathname.includes('/dashboard/settings');

  // Breadcrumbs para página de formulário - Apenas o status (sem duplicar o branding)
  const getBreadcrumbs = (): { label: string; href?: string }[] | null => {
    if (!isFormPage) return null;

    const items: { label: string; href?: string }[] = [];

    if (pathname === '/onboarding') {
      items.push({ label: 'Editar Perfil' });
    } else if (pathname.includes('/dashboard/settings/messages')) {
      items.push({ label: 'Configurar Mensagens' });
    } else if (pathname.includes('/dashboard/settings')) {
      items.push({ label: 'Preferências do Usuário' });
    } else if (pathname.includes('/edit')) {
      items.push({ label: 'Editar Galeria' });
    } else if (pathname.includes('/tags')) {
      items.push({ label: 'Marcações de Fotos' });
    } else if (pathname.includes('/leads')) {
      items.push({ label: 'Relatório de Cadastro de Visitantes' });
    } else if (pathname.includes('/new')) {
      items.push({ label: 'Nova Galeria' });
    }

    return items.length > 0 ? items : null;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      {/* 🎯 Navbar com Fundo Azul Petróleo */}
      <nav className="fixed top-0 left-0 w-full z-[110] flex items-center justify-between px-6 md:px-10 pt-1 bg-petroleum backdrop-blur-xl border-b border-white/10 shadow-2xl">
        {/* Branding Editorial com Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Botão Menu Mobile - Apenas no Dashboard */}
          {pathname === '/dashboard' && (
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 text-white/60 hover:text-gold hover:bg-white/5 rounded-luxury transition-colors shrink-0"
              aria-label="Abrir Menu"
            >
              <Menu size={22} />
            </button>
          )}

          {/* Botão Voltar - À esquerda do ícone da câmera quando em modo formulário */}
          {isFormPage && (
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/80 hover:text-gold hover:bg-white/5 rounded-luxury transition-colors shrink-0"
              aria-label="Voltar"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <Link
            href="/dashboard"
            className="flex items-center gap-2 group transition-all"
          >
            {/* 🎯 Ícone da Câmera - Apenas o ícone, sem borda e sem fundo */}
            <SegmentIcon
              className="text-champagne w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110"
              strokeWidth={1.5}
            />

            <span className=" text-lg md:text-[18px] font-semibold tracking-luxury-tight text-white italic">
              Espaço das <span className="text-champagne">Galerias</span>
            </span>
          </Link>

          {/* Breadcrumbs - Apenas o status (Editar Galeria ou Nova Galeria) */}
          {breadcrumbs && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <div key={index} className="flex items-center gap-1">
                    <span className="text-white/20 text-sm">/</span>
                    {isLast ? (
                      <span className="text-sm md:text-[18px] ml-1 text-white font-semibold tracking-luxury-tight italic">
                        {item.label}
                      </span>
                    ) : item.href ? (
                      <Link
                        href={item.href}
                        className="text-sm md:text-base text-white/90 hover:text-gold transition-colors font-medium"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-sm md:text-base text-white/90 font-medium">
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* Identidade do Usuário e Menu */}
        <div className="flex items-center gap-5">
          <UserMenu session={user} avatarUrl={avatarUrl} />
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-[55px] w-full" />
    </>
  );
}
