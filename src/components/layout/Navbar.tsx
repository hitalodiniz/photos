'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Camera, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@photos/core-auth';
import { UserMenu } from '@/components/auth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, avatarUrl, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // 🎯 Garante que só renderiza após montagem (evita problemas de hidratação)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 🎯 DEBUG: Log para diagnóstico (sempre)
  useEffect(() => {
    if (mounted) {
      const shouldShow = user && !isLoading && (pathname === '/dashboard' || pathname === '/onboarding' || pathname.includes('/dashboard/'));
      console.log('[Navbar] Debug:', {
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
      });
    }
  }, [pathname, user, isLoading, mounted]);

  // Não renderiza até montar (evita flash de conteúdo)
  if (!mounted) {
    console.log('[Navbar] Aguardando montagem...');
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
    console.log('[Navbar] Não mostrando navbar:', {
      reason: !user ? 'sem usuário' : isLoading ? 'carregando' : 'pathname não corresponde',
      pathname,
      hasUser: !!user,
      isLoading,
    });
    return null;
  }

  // Detectar se está na página de criação/edição de galeria ou onboarding
  const isFormPage = (pathname.includes('/dashboard/galerias/') && (pathname.includes('/new') || pathname.includes('/edit'))) || 
    pathname === '/onboarding';
  
  // Breadcrumbs para página de formulário - Apenas o status (sem duplicar o branding)
  const getBreadcrumbs = (): { label: string; href?: string }[] | null => {
    if (!isFormPage) return null;
    
    if (pathname === '/onboarding') {
      return [{ label: 'Editar Perfil' }];
    }
    if (pathname.includes('/edit')) {
      return [{ label: 'Editar Galeria' }];
    } else {
      return [{ label: 'Nova Galeria' }];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      {/* 🎯 Navbar com Fundo Azul Petróleo */}
      <nav className="fixed top-0 left-0 w-full z-[110] flex items-center justify-between px-6 md:px-10 py-2 bg-petroleum backdrop-blur-xl border-b border-white/10 shadow-2xl">
        {/* Branding Editorial com Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Botão Voltar - À esquerda do ícone da câmera quando em modo formulário */}
          {isFormPage && (
            <button
              onClick={() => router.back()}
              className="p-2 text-white/40 hover:text-gold hover:bg-white/5 rounded-luxury transition-colors shrink-0"
              aria-label="Voltar"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <Link
            href="/dashboard"
            className="flex items-center gap-3 group transition-all"
          >
            {/* 🎯 Ícone da Câmera - Apenas o ícone, sem borda e sem fundo */}
            <Camera
              className="text-champagne w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110"
              strokeWidth={1.5}
            />

            <span className="font-artistic text-lg md:text-[20px] font-bold tracking-tight text-white italic">
              Espaço das {' '}
              <span className="text-champagne">Galerias</span>
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
                      <span className="text-sm md:text-base ml-1 text-white font-bold tracking-tight italic">
                        {item.label}
                      </span>
                    ) : item.href ? (
                      <Link
                        href={item.href}
                        className="text-sm md:text-base text-white/40 hover:text-gold transition-colors font-medium"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-sm md:text-base text-white/40 font-medium">
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
      <div className="h-[72px] w-full" />
    </>
  );
}
