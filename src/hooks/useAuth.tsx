'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Use 'next/navigation' se estiver no App Router
// Se estiver no Pages Router, use: import { useRouter } from 'next/router';

import { supabase } from '@/lib/supabase.client'; // Ajuste o caminho conforme necessário

type User = {
  id: string;
  email: string | undefined;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
  });
  
  const router = useRouter();

  useEffect(() => {
    // 1. Lógica para verificar a sessão atual
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // O Supabase chama este evento toda vez que o estado de login muda (LOGIN, LOGOUT, REFRESH)
        
        if (session?.user) {
          // Usuário autenticado:
          setAuthState({
            user: { id: session.user.id, email: session.user.email },
            isLoading: false,
          });
        } else {
          // Usuário não logado:
          setAuthState({ user: null, isLoading: false });
        }
      }
    );

    // 2. Cleanup: Remove o listener de eventos ao desmontar o componente
    return () => {
      subscription.unsubscribe();
    };
  }, []); // A dependência vazia garante que o listener seja configurado apenas no mount

  // 3. Função de Logout para ser usada em qualquer lugar do app
  const logout = async () => {
    setAuthState({ ...authState, isLoading: true });
    await supabase.auth.signOut();
    // Após o logout, redireciona o usuário para a home page
    router.push('/'); 
  };
  
  // 4. Função de Redirecionamento (Guarda de Rota)
  // Use esta função em Server Components ou Client Components para proteger rotas
  const protectRoute = (redirectTo: string = '/') => {
      // Se o carregamento terminou E não há usuário, redireciona
      if (!authState.isLoading && !authState.user) {
          router.push(redirectTo);
      }
  };

  return { 
    ...authState, 
    logout, 
    protectRoute 
  };
};