'use client';

import { usePathname } from 'next/navigation';
import { Camera } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@photos/core-auth';
import { UserMenu } from '@/components/auth';

export default function Navbar() {
  const pathname = usePathname();
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

  return (
    <>
      {/* 🎯 Navbar com Fundo Dark da InfoBar para destacar o novo ícone */}
      <nav className="fixed top-0 left-0 w-full z-[110] flex items-center justify-between px-6 md:px-10 py-2 bg-[#1E293B] backdrop-blur-xl border-b border-white/10 shadow-2xl">
        {/* Branding Editorial */}
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
