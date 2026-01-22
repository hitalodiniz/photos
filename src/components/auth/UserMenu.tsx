'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Settings, Loader2, User, User2 } from 'lucide-react';
import { authService } from '@photos/core-auth';
import LoadingScreen from '../ui/LoadingScreen';

interface UserMenuProps {
  session: {
    id: string;
    email?: string;
    name?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  } | null;
  avatarUrl?: string | null;
}

export default function UserMenu({
  session,
  avatarUrl,
}: UserMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userEmail = session?.email || 'Usuário';

  const { fullName, displayAvatar, initialLetter } = useMemo(() => {
    const name = session?.user_metadata?.full_name || session?.name || userEmail.split('@')[0];
    return {
      fullName: name,
      displayAvatar: avatarUrl || session?.user_metadata?.avatar_url || null,
      initialLetter: name.charAt(0).toUpperCase(),
    };
  }, [session, avatarUrl, userEmail]);

  // 🎯 CORREÇÃO: Reseta o loading apenas quando a rota REALMENTE mudar
  useEffect(() => {
    const resetStates = () => {
      setIsRedirecting(false);
      setIsOpen(false);
    };
    resetStates();
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManageProfile = () => {
    // 🎯 Se já estiver na página, apenas fecha o menu
    if (pathname === '/onboarding') {
      setIsOpen(false);
      return;
    }
    setIsRedirecting(true);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setIsOpen(false);
    
    try {
      await authService.signOut();
      // O Supabase limpa os cookies localmente, mas forçamos um redirecionamento para a home
      window.location.href = '/';
    } catch (error) {
      console.error('[UserMenu] Erro ao deslogar:', error);
      setIsLoggingOut(false);
    }
  };

  const renderAvatarContent = (
    sizeClass: string,
    textClass: string,
    isLarge = false,
  ) => {
    const borderStyle = isLarge
      ? 'border-2 border-gold shadow-lg'
      : 'border border-gold/40 shadow-sm';
      
    if (displayAvatar) {
      return (
        <div
          className={`${sizeClass} rounded-full overflow-hidden relative flex-shrink-0 ${borderStyle} transition-transform hover:scale-105`}
        >
          <Image
            src={displayAvatar}
            alt="Avatar"
            fill
            className="object-cover"
            sizes="100px"
            priority
          />
        </div>
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full bg-petroleum text-gold flex items-center justify-center ${textClass} font-bold ${borderStyle} transition-transform hover:scale-105 shadow-[0_0_15px_rgba(212,175,55,0.2)]`}
      >
        {initialLetter}
      </div>
    );
  };

  return (
    <>
      {isLoggingOut && (
        <LoadingScreen message="Encerrando sua sessão com segurança..." fadeOut={false} />
      )}

      <div className="ml-auto">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative p-0.5 rounded-full transition-all focus:outline-none ring-offset-2 ring-offset-petroleum ${isOpen ? 'ring-2 ring-gold' : 'hover:ring-2 hover:ring-gold/30'} active:scale-95 disabled:opacity-50`}
            disabled={isLoggingOut || isRedirecting}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            {renderAvatarContent('w-10 h-10', 'text-sm')}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-4 w-72 bg-slate-950/95 backdrop-blur-xl rounded-luxury shadow-2xl border border-white/10 py-6 z-[110] animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center px-6 pb-6 text-center border-b border-white/5">
                <div className="mb-4 relative">
                  <div className="p-1 rounded-full bg-white/5 shadow-xl ring-1 ring-gold/20">
                    {renderAvatarContent('w-20 h-20', 'text-3xl', true)}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-slate-950 rounded-full shadow-sm" />
                </div>
                <h3 className="text-base font-bold text-white truncate w-full tracking-tight">
                  {fullName}
                </h3>
                <p className="text-[11px] text-white/60 truncate w-full font-bold tracking-luxury mt-1 uppercase">
                  {userEmail}
                </p>
              </div>

              <div className="px-4 pt-4 space-y-2">
                <Link
                  href="/onboarding"
                  onClick={handleManageProfile}
                  className={`w-full flex items-center justify-between px-4 h-12 rounded-luxury bg-white/5 text-white/80 hover:bg-gold/10 hover:text-gold transition-all group ${isRedirecting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-luxury bg-white/5 shadow-sm flex items-center justify-center text-white/40 group-hover:text-gold transition-colors">
                      <User2 size={16} />
                    </div>
                    <span className="text-editorial-label">
                      {isRedirecting ? 'Carregando...' : 'Editar Perfil'}
                    </span>
                  </div>
                  {isRedirecting ? (
                    <div className="loading-luxury w-3 h-3" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut || isRedirecting}
                  className="w-full flex items-center gap-3 px-4 h-12 rounded-luxury bg-transparent text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-luxury bg-white/5 flex items-center justify-center group-hover:text-red-400 transition-colors">
                    <LogOut size={16} />
                  </div>
                  <span className="text-editorial-label">
                    Sair da conta
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
