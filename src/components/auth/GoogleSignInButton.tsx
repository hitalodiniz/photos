'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase.client';
import { getBaseUrl } from '@/lib/get-base-url';

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      // 1. Buscar o domínio correto (local, subdomínio ou produção)
      const baseUrl = getBaseUrl();

      // 2. Montar o redirectTo correto
      const redirectTo = `${baseUrl}/api/auth/callback`;

      // 3. Iniciar o login
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes:
            'email profile openid https://www.googleapis.com/auth/drive.readonly',
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Erro ao iniciar login:', error);
        alert('Erro ao iniciar login: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={signInWithGoogle}
      disabled={loading}
      className={`
    relative flex items-center justify-center 
    w-full 
    max-w-[250px]
    md:max-w-sm
    bg-white text-[#3C4043] font-semibold rounded-xl 
    shadow-md border border-[#DADCE0]
    py-2  
    transition-all duration-300
    ${
      loading
        ? 'opacity-70 cursor-not-allowed'
        : 'hover:bg-[#FDFDFD] hover:border-[#D1D3D6] hover:shadow-md active:scale-[1.05]'
    }
  `}
    >
      {!loading ? (
        <>
          {/* Ícone do Google - Removida a rotação no hover */}
          <svg className="w-4 h-4 md:w-6 md:h-6 mr-3" viewBox="0 0 48 48">
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
          <span className="tracking-tight text-[12px] md:text-base">
            Entrar com sua conta do Google
          </span>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#4285F4] font-medium">
            Conectando ao Google...
          </span>
        </div>
      )}
    </button>
  );
}
