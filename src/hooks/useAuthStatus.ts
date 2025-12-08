// hooks/useAuthStatus.ts
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Ajuste o caminho conforme necessário

interface AuthStatus {
    session: any;
    loading: boolean;
    handleLogout: () => void;
}

const DESTINATION_PATH = '/dashboard'; // Mantenha a variável interna do hook

export default function useAuthStatus(): AuthStatus {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const router = useRouter(); 

    // 1. Função de Logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        // Redireciona para a raiz após o logout
        router.replace('/'); 
    };

    useEffect(() => { 
        // 1. OBTENÇÃO E LISTENER DE ESTADO
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            
            // Lógica de Redirecionamento de LOGOUT
            const currentPath = window.location.pathname;

            if (event === 'SIGNED_OUT' && (currentPath === DESTINATION_PATH || currentPath === '/onboarding')) {
                router.replace('/');
            }
            
            // Garante que o estado de loading seja falso após o evento inicial
            setLoading(false); 
        });

        // 2. BUSCA DA SESSÃO INICIAL (para carregar o estado atual rapidamente)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false); // Define loading como false após a leitura inicial
        });

        return () => subscription.unsubscribe();
    }, [router]);
    
    return { session, loading, handleLogout };
}