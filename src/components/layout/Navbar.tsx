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
  const { user, avatarUrl, logout, isLoading } = useAuth();
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

  // Detectar se está na página de criação/edição de galeria
  const isGaleriaFormPage = pathname.includes('/dashboard/galerias/') && 
    (pathname.includes('/new') || pathname.includes('/edit'));
  
  // Breadcrumbs para página de galeria
  const getBreadcrumbs = () => {
    if (!isGaleriaFormPage) return null;
    
    if (pathname.includes('/edit')) {
      // Para edição, precisamos do título da galeria (vem do contexto ou pode ser simplificado)
      return [
        { label: 'Galerias', href: '/dashboard' },
        { label: 'Editar' },
      ];
    } else {
      return [
        { label: 'Galerias', href: '/dashboard' },
        { label: 'Nova Galeria' },
      ];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      {/* 🎯 Navbar com Fundo Azul Petróleo */}
      <nav className="fixed top-0 left-0 w-full z-[110] flex items-center justify-between px-6 md:px-10 py-2 bg-petroleum backdrop-blur-xl border-b border-slate-700/50 shadow-2xl">
        {/* Branding Editorial com Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group transition-all"
          >
            {/* 🎯 Novo Ícone Estilo Glow/Glassmorphism */}
            <div className="p-2 md:p-2.5 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl transition-transform group-hover:scale-110">
              <Camera
                className="text-[#F3E5AB] w-5 h-5 md:w-6 md:h-6 drop-shadow-[0_0_15px_rgba(243,229,171,0.3)]"
                strokeWidth={1.5}
              />
            </div>

            <span className="font-artistic text-lg md:text-[20px] font-semibold tracking-tight text-white italic">
              Espaço das Galerias de{' '}
              <span className="text-[#F3E5AB]">Mídias</span>
            </span>
          </Link>

          {/* Breadcrumbs - Na frente do título quando na página de galeria */}
          {breadcrumbs && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 ml-4">
              <button
                onClick={() => router.back()}
                className="p-0.5 text-white/60 hover:text-white transition-colors"
                aria-label="Voltar"
                title="Voltar"
              >
                <ArrowLeft size={12} />
              </button>
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <div key={index} className="flex items-center gap-1">
                    <span className="text-white/40 text-[10px]">/</span>
                    {isLast ? (
                      <span className="text-[10px] text-white/90 font-medium">
                        {item.label}
                      </span>
                    ) : item.href ? (
                      <Link
                        href={item.href}
                        className="text-[10px] text-white/70 hover:text-white transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-white/70">
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* Menu do Usuário */}
        <div className="flex items-center gap-4">
          <UserMenu session={user} avatarUrl={avatarUrl} />
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-[72px] w-full" />
    </>
  );
}
