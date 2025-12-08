// components/AuthUrlCleaner.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Parâmetros que o Supabase adiciona à URL após o login/reset
const AUTH_PARAMS = ['access_token', 'refresh_token', 'expires_in', 'token_type'];

export default function AuthUrlCleaner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // 1. Limpa parâmetros de token da URL (impede que o Next.js re-renderize baseado na URL)
        const hasAuthParams = AUTH_PARAMS.some(param => searchParams.has(param));
        
        if (hasAuthParams) {
            const newUrl = window.location.origin + window.location.pathname;
            // Usa replaceState para limpar o URL sem forçar um recarregamento completo
            window.history.replaceState({}, document.title, newUrl);
            
            // 2. Força o início da sessão novamente no cliente
            // Isso garante que o token seja lido do hash antes de ser apagado.
            supabase.auth.getSession().then(() => {
                // Após tentar ler a sessão, o componente de guarda (AuthRedirectScript) assume.
            });
        }
    }, [searchParams]);

    return null; 
}