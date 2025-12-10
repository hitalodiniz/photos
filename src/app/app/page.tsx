// app/app/page.tsx (FINAL: Guarda de Cliente e Redirecionamento Estável)
'use client';

import useAuthStatus from '@/hooks/useAuthStatus';
import { supabase } from '@/lib/supabase.client'; // Cliente de browser
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation'; // Adicionado para limpeza de URL
import { createClient } from '@supabase/supabase-js'
const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


// Define a estrutura mínima do perfil
interface Profile {
    full_name: string | null;
    mini_bio: string | null;
    username: string | null;
}

export default function AppClientGuard() {
  
    // 1. 🚨 CHAMADAS DE HOOKS
    const { session, loading: authLoading } = useAuthStatus();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [cookieSyncing, setCookieSyncing] = useState(false); // NOVO ESTADO

    // 1. EFEITO PARA FORÇAR A GRAVAÇÃO DO COOKIE HTTP
    useEffect(() => {
        const hasTokenInStorage = !!localStorage.getItem('sb-bdgqiyvasucvhihaueuk-auth-token');

        // Esta é a única maneira de o servidor ler o token do Local Storage.
        if (session && hasTokenInStorage && !cookieSyncing) {
            setCookieSyncing(true);
            console.log('Sessão encontrada no Cliente. Forçando a sincronização de cookies...');

            // Usa refreshSession para forçar a escrita do cookie HTTP
            supabase.auth.refreshSession()
                .then(() => {
                    console.log('Sincronização de cookies concluída. Tentando redirecionar.');
                })
                .catch(e => {
                    console.error("Falha na sincronização de cookies:", e);
                })
                .finally(() => {
                    // Após a sincronização (bem-sucedida ou falha), permite que o useEffect principal prossiga.
                    setCookieSyncing(false);
                });
        }
    }, [session, cookieSyncing]);


    // 2. LÓGICA DE BUSCA DO PERFIL E REDIRECIONAMENTO DE ESTADO
    useEffect(() => {
        const user = session?.user;
        //console.log("AppClientGuard: Verificando sessão e perfil...", { session });

        // Redirecionamento de Logout: Se o carregamento terminou e não há sessão, volte para a raiz.
        if (!authLoading && !session) {
            router.replace('/');
            return;
        }

        const fetchProfileAndRedirect = async () => {
            // Se a sessão existe E o perfil ainda está carregando/pendente
            if (user && !cookieSyncing && profileLoading) {                // Busca o perfil (esta parte usa o cliente de BROWSER e RLS)
                const { data, error } = await supabase
                    .from('tb_profiles')
                    .select('full_name, username, mini_bio')
                    .eq('id', user.id)
                    .single();

                const currentProfile: Profile = data || { full_name: null, username: null, mini_bio: null };
                setProfile(currentProfile);

                // Critério de completude
                const isComplete = currentProfile.full_name && currentProfile.username && currentProfile.mini_bio;

                // 🚨 DECISÃO DE NAVEGAÇÃO
                if (!isComplete) {
                    router.replace('/onboarding');
                } else {
                    router.replace('/dashboard');
                }

                setProfileLoading(false);
            }
        };

        // Inicia a busca se autenticado
        if (session && !cookieSyncing) {
            fetchProfileAndRedirect();
        }

    }, [session, authLoading, profileLoading, router, cookieSyncing]);

    // 3. RETORNOS DE ESTADO (UI para o usuário)
    if (authLoading || profileLoading || cookieSyncing) { // Inclui o novo estado
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-[#F8FAFD] text-gray-700">
                <p>{cookieSyncing ? 'Sincronizando sessão no servidor...' : 'Verificando seu acesso...'}</p>
            </div>
        );
    }
    // Retorna nulo no final, pois o redirecionamento já foi iniciado
    return null;
}