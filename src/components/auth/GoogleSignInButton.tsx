'use client';

import { useState } from 'react';
import { authService } from '@photos/core-auth';
import { LogIn } from 'lucide-react';

interface GoogleSignInButtonProps {
  forceConsent?: boolean;
  variant?: 'full' | 'minimal'; // Adicionada variante
}

export default function GoogleSignInButton({
  forceConsent = false,
  variant = 'minimal',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      // 🎯 Usa forceConsent para forçar consent quando necessário
      // Por padrão, usa select_account (login rápido)
      await authService.signInWithGoogle(forceConsent);
    } catch (error: any) {
      console.error('Erro ao iniciar login:', error);
      alert('Erro ao iniciar login: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Estilo para quando estiver na BARRA SUPERIOR
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleLogin}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-luxury border border-gold/40 bg-transparent transition-all group ${
          loading
            ? 'cursor-not-allowed opacity-70'
            : 'hover:bg-gold/10'
        }`}
      >
        {loading ? (
          <span className="text-[10px] text-white animate-pulse">
            CONECTANDO...
          </span>
        ) : (
          <>
            <LogIn size={14} className="text-gold" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              Google Login
            </span>
          </>
        )}
      </button>
    );
  }
  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className={`
    relative flex items-center justify-center 
    w-full 
    max-w-[250px]
    md:max-w-sm
    bg-white text-petroleum rounded-luxury 
    shadow-xl border border-petroluem/20
    py-3  
    transition-all duration-300
    
    ${
      loading
        ? 'opacity-70 cursor-not-allowed'
        : 'hover:bg-slate-50 active:scale-[0.98]'
    }
  `}
    >
      {!loading ? (
        <>
          {/* Ícone do Google */}
          <svg className="w-4 h-4 md:w-5 md:h-5 mr-3" viewBox="0 0 48 48">
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
          <span className="text-editorial-label text-petroleum">
            Entrar com Google
          </span>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <div className="loading-luxury w-5 h-5 border-petroleum/20 border-t-petroleum" />
          <span className="text-editorial-label text-petroleum">
            Conectando...
          </span>
        </div>
      )}
    </button>
  );
}
