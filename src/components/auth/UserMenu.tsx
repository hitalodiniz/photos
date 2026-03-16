'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  User2,
  Settings2,
  MessageSquare,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@photos/core-auth';
import { useNavigation } from '../providers/NavigationProvider';
import { PLAN_ICONS } from '@/components/ui/Upgradesheet/constants';
import type { PlanKey } from '@/core/config/plans';

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
  /** Perfil do usuário (tb_profiles). Se roles incluir 'admin', exibe entrada do Painel Admin. */
  profile?: { roles?: string[]; plan_key?: PlanKey } | null;
  /** Plano atual (do usePlan). Usado para exibir ícone e nome no menu. */
  planKey?: PlanKey;
  /** Nome de exibição do plano (ex.: "Start", "Pro"). */
  planName?: string;
  /** Callback para abrir o modal do Painel Admin (Cache & Tokens). Usado na Navbar. */
  onOpenAdminModal?: () => void;
}

export default function UserMenu({
  session,
  avatarUrl,
  profile,
  planKey,
  planName,
  onOpenAdminModal,
}: UserMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { logout, isLoggingOut } = useAuth();
  const { navigate, isNavigating } = useNavigation();
  const menuRef = useRef<HTMLDivElement>(null);

  const userEmail = session?.email || 'Usuário';
  const username =
    (session?.user_metadata as { username?: string } | undefined)?.username ||
    userEmail.split('@')[0];

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

  useEffect(() => setIsOpen(false), [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderAvatarContent = (
    sizeClass: string,
    textClass: string,
    isLarge = false,
  ) => {
    const borderStyle = isLarge
      ? 'border-2 border-gold shadow-lg'
      : 'border border-gold/40';

    if (displayAvatar) {
      return (
        <div
          className={`${sizeClass} rounded-full overflow-hidden relative flex-shrink-0 ${borderStyle} transition-transform hover:scale-105`}
        >
          <img
            src={displayAvatar}
            alt="Avatar"
            className="object-cover w-full h-full"
          />
        </div>
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full bg-white text-petroleum flex items-center justify-center ${textClass} font-medium ${borderStyle} transition-transform hover:scale-105 shadow-[0_0_15px_rgba(212,175,55,0.2)]`}
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
          className={`relative p-0.5 rounded-full transition-all ${isOpen ? 'ring-2 ring-gold scale-95' : 'hover:ring-2 hover:ring-gold/30'}`}
          disabled={isLoggingOut || isNavigating}
        >
          {renderAvatarContent('w-9 h-9 md:w-10 md:h-10', 'text-sm')}
        </button>

        {isOpen && (
          /* 🎯 glass-surface-dark: Fundo translúcido com desfoque profundo */
          <div className="absolute right-0 mt-1 w-72 glass-surface rounded-xl py-4 z-[110] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center px-6 pb-2 text-center border-b border-white/5">
              <Link
                href={`/${username}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center"
              >
                <div className="mb-2 relative">
                  <div className="p-1 rounded-full bg-white/5 ring-1 ring-gold/20">
                    {renderAvatarContent('w-16 h-16', 'text-2xl', true)}
                  </div>
                  <div className="absolute bottom-0 right-1 w-4 h-4 bg-status-success border-2 border-petroleum rounded-full" />
                </div>
                <h3 className="text-[15px] font-semibold text-white truncate w-full tracking-luxury-tight">
                  {fullName}
                </h3>
                <p className="text-[9px] text-white/80 truncate w-full font-medium tracking-luxury-wide mt-1">
                  {userEmail}
                </p>
              </Link>
              {(planKey || planName) && (
                <p className="flex items-center justify-center gap-1.5 text-[10px] text-white/80 font-medium tracking-luxury-wide mt-1 uppercase">
                  {planKey && PLAN_ICONS[planKey] && (
                    <span className="text-gold shrink-0">
                      {React.createElement(PLAN_ICONS[planKey], { size: 12 })}
                    </span>
                  )}
                  <span className="truncate">
                    {planName
                      ? `Plano ${planName}`
                      : planKey
                        ? `Plano ${planKey}`
                        : ''}
                  </span>
                </p>
              )}
            </div>
            <div className="px-3 pt-2 space-y-1">
              {profile?.roles?.includes('admin') && onOpenAdminModal && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAdminModal();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-champagne hover:bg-white/5 transition-all text-[13px] font-medium border-b border-white/5 mb-2"
                >
                  <ShieldAlert size={16} strokeWidth={2} />
                  <span className="flex-1 text-left">Painel Admin</span>
                </button>
              )}
              {[
                { label: 'Editar Perfil', icon: User2, path: '/onboarding' },
                {
                  label: 'Assinatura',
                  icon: CreditCard,
                  path: '/dashboard/assinatura',
                },
                {
                  label: 'Preferências',
                  icon: Settings2,
                  path: '/dashboard/settings',
                },
                {
                  label: 'Mensagens',
                  icon: MessageSquare,
                  path: '/dashboard/settings/messages',
                },
              ].map((item) => (
                <button
                  key={item.path}
                  onClick={() =>
                    navigate(
                      item.path,
                      `Abrindo ${item.label.toLowerCase()}...`,
                    )
                  }
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/90 hover:text-champagne hover:bg-white/5 transition-all text-[13px] font-medium"
                >
                  <item.icon size={16} strokeWidth={1.5} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              ))}

              <button
                onClick={logout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-400/5 transition-all text-[13px] font-medium border-t border-white/5 mt-2"
              >
                <LogOut size={16} strokeWidth={1.5} />
                <span className="flex-1 text-left">Sair da conta</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
