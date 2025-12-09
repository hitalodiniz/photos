// app/app/page.tsx (CORRIGIDO PARA USO SEGURO DE HOOKS E REDIRECIONAMENTO)
'use client'; 

import useAuthStatus from '@/hooks/useAuthStatus'; 
import { supabase } from '@/lib/supabase.client'; // Importa o cliente de browser
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// 🚨 Nota: Removido o import de 'redirect' pois não deve ser usado em Client Components

// Define a estrutura mínima do perfil
interface Profile {
    full_name: string | null;
    username: string | null;
}

export default function AppClientGuard() {
    // 1. 🚨 CHAMADAS DE HOOKS (Sempre no topo e incondicionalmente)
    const { session, loading: authLoading } = useAuthStatus();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const router = useRouter();


    // 2. LÓGICA DE BUSCA DO PERFIL E REDIRECIONAMENTO DE ESTADO
    useEffect(() => {
        // Redirecionamento de Logout: Se a sessão sumir, volte para a raiz.
        if (!authLoading && !session) {
            router.replace('/');
            return;
        }

        const fetchProfileAndRedirect = async () => {
            // Se a sessão existe E o perfil ainda está carregando/pendente
            if (session && profileLoading) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, username')
                    .eq('id', session.user.id)
                    .single();

                const currentProfile = data || { full_name: null, username: null };
                setProfile(currentProfile);

                const isComplete = currentProfile.full_name && currentProfile.username;
                
                // 🚨 DECISÃO DE NAVEGAÇÃO
                if (!isComplete) {
                    console.log('Redirecionando para onboarding devido a perfil incompleto:', currentProfile);
                    router.replace('/onboarding');
                } else {
                    console.log('Perfil completo. Redirecionando para dashboard.');
                    router.replace('/dashboard');
                }
                
                setProfileLoading(false);
            }
        };

        // Inicia a busca se autenticado e o carregamento não terminou
        if (session) {
            fetchProfileAndRedirect();
        }

    }, [session, authLoading, profileLoading, router]); // Dependências completas

    // 3. RETORNOS DE ESTADO (UI para o usuário)

    // Enquanto a autenticação ou o carregamento do perfil estiverem ativos
    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-[#F8FAFD] text-gray-700">
                <p>Verificando seu perfil e status de login...</p>
            </div>
        );
    }

    // Retorna nulo no final, pois o componente irá navegar via router.replace()
    return null;
}