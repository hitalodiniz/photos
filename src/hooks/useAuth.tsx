'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase.client';

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
    // 1. Verificação imediata da sessão para evitar 'flicker'
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthState({
          user: { id: session.user.id, email: session.user.email },
          isLoading: false,
        });
      } else {
        setAuthState({ user: null, isLoading: false });
      }
    };

    initializeAuth();

    // 2. Listener de eventos em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setAuthState({
            user: { id: session.user.id, email: session.user.email },
            isLoading: false,
          });
        } else {
          setAuthState({ user: null, isLoading: false });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    await supabase.auth.signOut();
    router.replace('/'); // replace impede que o usuário volte ao dashboard deslogado
  };
  
  // 3. Função de proteção memorizada com useCallback
  const protectRoute = useCallback((redirectTo: string = '/') => {
      if (!authState.isLoading && !authState.user) {
          // replace é mais seguro para rotas protegidas
          router.replace(redirectTo);
      }
  }, [authState.isLoading, authState.user, router]);

  return { 
    ...authState, 
    logout, 
    protectRoute 
  };
};