'use client';

import { useState, useRef, useEffect } from 'react';
import { authService } from '@photos/core-auth';
import { LogIn, User, ShieldCheck, ChevronDown } from 'lucide-react';
import AccessUsername from './AccessUsername';

interface AuthButtonProps {
  forceConsent?: boolean;
  variant?: 'full' | 'minimal';
}

export default function AuthButton({
  forceConsent = false,
  variant = 'minimal',
}: AuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // 🎯 Estado para o Modal

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setIsOpen(false);
      await authService.signInWithGoogle(forceConsent);
    } catch (error: any) {
      console.error('Erro ao iniciar login:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = () => {
    setIsOpen(false); // Fecha o dropdown
    setIsModalOpen(true); // Abre o modal editorial
  };

  // --- VARIANTE MINIMAL (Para a Toolbar) ---
  if (variant === 'minimal') {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          // Ajustado para px-4 para igualar ao botão de Planos e removido pr-4
          className="flex items-center gap-2 px-4 py-2 rounded-luxury bg-transparent hover:bg-white/5 transition-all group"
        >
          {/* Ícone reduzido para 14 para alinhar com o stroke mais fino do LayoutGrid */}
          <LogIn size={18} className="text-champagne" strokeWidth={1.5} />

          <span className="text-[10px] font-semibold uppercase tracking-luxury-widest text-white">
            {loading ? 'CONECTANDO...' : 'ENTRAR'}
          </span>

          {/* Chevron mantido discreto para indicar o dropdown */}
          <ChevronDown
            size={12}
            className={`text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Minimalista */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-petroleum/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 z-[110]">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#4285F4"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#34A853"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#EA4335"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span className="text-xs font-medium uppercase tracking-widest">
                Google Auth
              </span>
            </button>

            <div className="h-[1px] bg-white/5 my-1" />

            <button
              onClick={handlePasswordLogin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white transition-colors"
            >
              <User size={16} className="text-champagne" />
              <span className="text-xs font-medium uppercase tracking-widest">
                Usuário e Senha
              </span>
            </button>
          </div>
        )}
        {/* 🎯 RENDERIZAÇÃO DO MODAL DE LOGIN */}
        <AccessUsername
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    );
  }

  // --- VARIANTE FULL (Para o Hero/Landing) ---
  return (
    <>
      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center bg-white text-petroleum rounded-full py-3 shadow-xl hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
            <path
              fill="#4285F4"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#34A853"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#EA4335"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em]">
            {loading ? 'Conectando...' : 'Entrar com Google'}
          </span>
        </button>

        <button
          onClick={handlePasswordLogin}
          className="w-full py-3 rounded-full border border-white/20 text-white text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-white/5 transition-all"
        >
          Acesso via E-mail
        </button>
      </div>
      {/* 🎯 RENDERIZAÇÃO DO MODAL DE LOGIN */}
      <AccessUsername
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
