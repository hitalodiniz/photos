'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Session } from '@supabase/supabase-js';

export default function UserMenu({
  session,
  handleLogout,
  avatarUrl,
}: {
  session: Session;
  handleLogout: () => void;
  avatarUrl?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userEmail = session.user.email || 'Usuário';
  const fullName =
    session.user.user_metadata?.full_name || userEmail.split('@')[0];
  const displayAvatar =
    avatarUrl || session.user.user_metadata?.avatar_url || null;
  const initialLetter = fullName.charAt(0).toUpperCase();

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
    try {
      await handleLogout();
    } catch (error) {
      setIsLoggingOut(false);
      console.error('Erro ao sair:', error);
    }
  };

  const renderAvatarContent = (
    sizeClass: string,
    textClass: string,
    isLarge: boolean = false,
  ) => {
    // Borda estilo Onboarding: sutilmente dourada quando em destaque
    const borderStyle = isLarge
      ? 'border-2 border-[#F3E5AB]'
      : 'border border-[#F3E5AB]/50';

    if (displayAvatar) {
      return (
        <div
          className={`${sizeClass} rounded-full overflow-hidden relative flex-shrink-0 ${borderStyle} shadow-sm transition-all duration-300`}
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
        className={`${sizeClass} rounded-full bg-[#0B57D0] text-white flex items-center justify-center ${textClass} font-semibold ${borderStyle} shadow-sm`}
      >
        {initialLetter}
      </div>
    );
  };

  return (
    <div className="ml-auto">
      <div className="relative" ref={menuRef}>
        {/* Botão Gatilho - Segue o padrão de botões globais com active:scale-95 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-0.5 rounded-full hover:bg-[#F3E5AB]/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 active:scale-95 disabled:opacity-50"
          disabled={isLoggingOut}
        >
          {renderAvatarContent('w-10 h-10', 'text-sm')}
        </button>

        {/* Popover Estilo Google Onboarding */}
        {isOpen && (
          <div className="absolute right-0 mt-3 w-72 bg-white rounded-[28px] shadow-[0_12px_40px_rgba(212,175,55,0.15)] border border-[#F3E5AB]/40 py-5 z-[100] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center px-6 pb-4">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-4">
                Sua Conta
              </span>

              {/* Avatar Central com borda reforçada */}
              <div className="mb-3 p-1 rounded-full bg-white shadow-sm ring-1 ring-[#F3E5AB]">
                {renderAvatarContent('w-20 h-20', 'text-3xl', true)}
              </div>

              <p className="text-base font-semibold text-[#1F1F1F] truncate w-full text-center">
                {fullName}
              </p>
              <p className="text-sm text-gray-500 mb-6 truncate w-full text-center font-normal">
                {userEmail}
              </p>

              {/* Botão Segue Padrão Global do Onboarding */}
              <Link href="/onboarding" className="btn-primary text[10px]">
                Gerenciar conta
              </Link>
            </div>

            <div className="mx-6 border-t border-[#F3E5AB]/20 my-2"></div>

            <div className="px-3">
              <button
                onClick={onLogoutClick}
                disabled={isLoggingOut}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold rounded-2xl transition-all group ${
                  isLoggingOut
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'text-[#B3261E] hover:bg-red-50'
                }`}
              >
                {isLoggingOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-red-600 mr-1"></div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </div>
                )}
                {isLoggingOut ? 'Saindo da conta...' : 'Sair da conta'}
              </button>
            </div>

            <div className="px-6 pt-4 flex justify-center gap-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <Link href="#" className="hover:text-[#D4AF37] transition-colors">
                Privacidade
              </Link>
              <Link href="#" className="hover:text-[#D4AF37] transition-colors">
                Termos
              </Link>
            </div>
          </div>
        )}
      </div>

      {isLoggingOut && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] bg-[#1F1F1F] text-[#FDF8E7] px-8 py-3.5 rounded-full text-xs font-bold shadow-2xl animate-in slide-in-from-bottom-4 border border-[#D4AF37]/30 tracking-widest uppercase">
          Encerrando sessão com segurança
        </div>
      )}
    </div>
  );
}
