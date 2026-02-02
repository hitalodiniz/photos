'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, User2, Settings2, MessageSquare } from 'lucide-react';
import { authService, useAuth } from '@photos/core-auth';
import { useNavigation } from '../providers/NavigationProvider';

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

export default function UserMenu({ session, avatarUrl }: UserMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { logout, isLoggingOut } = useAuth();
  const { navigate, isNavigating } = useNavigation();
  const menuRef = useRef<HTMLDivElement>(null);

  const userEmail = session?.email || 'Usuário';

  const { fullName, displayAvatar, initialLetter } = useMemo(() => {
    const name =
      session?.user_metadata?.full_name ||
      session?.name ||
      userEmail.split('@')[0];
    return {
      fullName: name,
      displayAvatar: avatarUrl || session?.user_metadata?.avatar_url || null,
      initialLetter: name.charAt(0).toUpperCase(),
    };
  }, [session, avatarUrl, userEmail]);

  // 🎯 CORREÇÃO: Reseta o menu apenas quando a rota mudar
  useEffect(() => {
    setIsOpen(false);
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
    navigate('/onboarding', 'Abrindo seu perfil...');
  };

  const handleNavigate = (path: string, message: string) => {
    if (pathname === path) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    navigate(path, message);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
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
        className={`${sizeClass} rounded-full bg-white text-petroleum flex items-center justify-center ${textClass} font-bold ${borderStyle} transition-transform hover:scale-105 shadow-[0_0_15px_rgba(212,175,55,0.2)]`}
      >
        {initialLetter}
      </div>
    );
  };

  return (
    <div className="ml-auto">
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-0.5 rounded-full transition-all focus:outline-none ring-offset-2 ring-offset-white ${isOpen ? 'ring-2 ring-gold' : 'hover:ring-2 hover:ring-gold/30'} active:scale-95 disabled:opacity-50`}
          disabled={isLoggingOut || isNavigating}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {renderAvatarContent('w-10 h-10', 'text-sm')}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-4 w-72 bg-white rounded-luxury shadow-2xl border border-petroleum/10 py-6 z-[110] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center px-6 pb-6 text-center border-b border-petroleum/5">
              <div className="mb-4 relative">
                <div className="p-1 rounded-full bg-slate-50 shadow-xl ring-1 ring-gold/20">
                  {renderAvatarContent('w-20 h-20', 'text-3xl', true)}
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-sm" />
              </div>
              <h3 className="text-base font-bold text-petroleum truncate w-full tracking-luxury-tight">
                {fullName}
              </h3>
              <p className="text-[11px] text-editorial-gray truncate w-full font-bold tracking-luxury mt-1 uppercase">
                {userEmail}
              </p>
            </div>

            <div className="px-4 pt-4 space-y-2">
              <Link
                href="/onboarding"
                onClick={(e) => {
                  e.preventDefault();
                  handleManageProfile();
                }}
                className={`btn-secondary-white w-full !h-10 !justify-start gap-4 px-4 hover:!text-petroleum hover:!bg-champagne ${isNavigating ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <User2 size={18} />
                <span className="flex-1 text-left">
                  {isNavigating ? 'Carregando...' : 'Editar Perfil'}
                </span>
                {isNavigating && (
                  <div className="loading-luxury-dark w-4 h-4" />
                )}
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate(
                    '/dashboard/settings',
                    'Abrindo preferências...',
                  );
                }}
                className={`btn-secondary-white w-full !h-10 !justify-start gap-4 px-4 hover:!text-petroleum hover:!bg-champagne transition-all ${isNavigating ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <Settings2 size={18} />
                <span className="flex-1 text-left">
                  {isNavigating ? 'Carregando...' : 'Preferências'}
                </span>
                {isNavigating && (
                  <div className="loading-luxury-dark w-4 h-4" />
                )}
              </Link>

              <Link
                href="/dashboard/settings/messages"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate(
                    '/dashboard/settings/messages',
                    'Abrindo configurações de mensagens...',
                  );
                }}
                className={`btn-secondary-white w-full !h-10 !justify-start gap-4 px-4 hover:!text-petroleum hover:!bg-champagne transition-all ${isNavigating ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <MessageSquare size={18} />
                <span className="flex-1 text-left">
                  {isNavigating ? 'Carregando...' : 'Configurar Mensagens'}
                </span>
                {isNavigating && (
                  <div className="loading-luxury-dark w-4 h-4" />
                )}
              </Link>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut || isNavigating}
                className="btn-secondary-white w-full !h-10 !justify-start gap-4 px-4 hover:!text-red-600 hover:!border-red-200 hover:!bg-red-50 transition-all disabled:opacity-50"
              >
                <LogOut size={18} />
                <span className="flex-1 text-left">Sair da conta</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
