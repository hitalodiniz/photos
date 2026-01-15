'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Settings, Loader2 } from 'lucide-react';

export default function UserMenu({
  session,
  avatarUrl,
}: {
  session: { id: string; email?: string; name?: string } | any;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userEmail = session?.email || 'Usuário';

  const { fullName, displayAvatar, initialLetter } = useMemo(() => {
    const name = session?.name || userEmail.split('@')[0];
    return {
      fullName: name,
      displayAvatar: avatarUrl || null,
      initialLetter: name.charAt(0).toUpperCase(),
    };
  }, [session, avatarUrl, userEmail]);

  // 🎯 CORREÇÃO: Reseta o loading apenas quando a rota REALMENTE mudar
  // Removemos a dependência do isOpen que estava fazendo o menu piscar
  useEffect(() => {
    setIsRedirecting(false);
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

  const onLogoutClick = async () => {
    setIsLoggingOut(true);
    window.location.href = '/auth/logout';
  };

  const handleManageProfile = (e: React.MouseEvent) => {
    // 🎯 Se já estiver na página, apenas fecha o menu e previne o loading
    if (pathname === '/onboarding') {
      setIsOpen(false);
      // Não ativamos o isRedirecting aqui
      return;
    }
    setIsRedirecting(true);
  };

  const renderAvatarContent = (
    sizeClass: string,
    textClass: string,
    isLarge = false,
  ) => {
    const borderStyle = isLarge
      ? 'border-2 border-[#D4AF37]'
      : 'border border-[#D4AF37]/40';
    if (displayAvatar) {
      return (
        <div
          className={`${sizeClass} rounded-full overflow-hidden relative flex-shrink-0 ${borderStyle} shadow-sm`}
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
        className={`${sizeClass} rounded-full bg-[#1E293B] text-[#F3E5AB] flex items-center justify-center ${textClass} font-semibold ${borderStyle} shadow-sm`}
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
          className="relative p-0.5 rounded-full hover:bg-[#D4AF37]/10 transition-all focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 active:scale-95 disabled:opacity-50"
          disabled={isLoggingOut || isRedirecting}
        >
          {renderAvatarContent('w-10 h-10', 'text-sm')}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-72 bg-white rounded-[24px] shadow-[0_12px_40px_rgba(212,175,55,0.12)] border border-[#D4AF37]/20 py-5 z-[100] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center px-6 pb-4 text-center">
              <div className="mb-3 p-1 rounded-full bg-white shadow-sm ring-1 ring-[#D4AF37]/30">
                {renderAvatarContent('w-20 h-20', 'text-3xl', true)}
              </div>
              <p className="text-base font-semibold text-slate-900 truncate w-full">
                {fullName}
              </p>
              <p className="text-xs text-slate-500 mb-6 truncate w-full font-medium">
                {userEmail}
              </p>

              <Link
                href="/onboarding"
                onClick={handleManageProfile}
                className={`w-full flex items-center justify-center gap-2 h-10 rounded-[0.5rem] bg-[#F3E5AB] text-black text-[11px] font-semibold uppercase tracking-widest shadow-xl hover:bg-white transition-all active:scale-95 border border-[#F3E5AB]/20 ${isRedirecting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isRedirecting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Aguarde...
                  </>
                ) : (
                  <>
                    <Settings size={14} />
                    Configurar Perfil
                  </>
                )}
              </Link>
            </div>

            <div className="mx-6 border-t border-slate-100 my-2"></div>

            <div className="px-6">
              <button
                onClick={onLogoutClick}
                disabled={isLoggingOut || isRedirecting}
                className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-[0.5rem] border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95 disabled:opacity-50 font-semibold text-[11px] uppercase tracking-widest"
              >
                {isLoggingOut ? (
                  <Loader2 size={14} className="animate-spin text-red-600" />
                ) : (
                  <LogOut size={14} />
                )}
                {isLoggingOut ? 'Saindo...' : 'Sair da conta'}
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoggingOut && (
        <div className="fixed inset-0 z-[120] bg-white/80 backdrop-blur-md animate-in fade-in duration-500 flex items-center justify-center">
          <div className="bg-[#1E293B] text-[#F3E5AB] px-8 py-4 rounded-full text-[10px] font-semibold shadow-2xl animate-in zoom-in duration-300 border border-[#D4AF37]/30 tracking-[0.2em] uppercase flex items-center gap-3">
            <Loader2 size={16} className="animate-spin" />
            {isLoggingOut ? 'Encerrando sessão' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
