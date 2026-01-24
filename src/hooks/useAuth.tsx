'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@photos/core-auth';

// 🎯 Atualizado para suportar metadados do perfil
type User = {
  id: string;
  email: string | undefined;
  name?: string;
  avatarUrl?: string;
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

  // Função auxiliar para formatar o usuário do Supabase para o nosso tipo
  const mapUser = (supabaseUser: any): User => ({
    id: supabaseUser.id,
    email: supabaseUser.email,
    // Busca o nome e avatar nos metadados (Google ou cadastro manual)
    name:
      supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
    avatarUrl:
      supabaseUser.user_metadata?.avatar_url ||
      supabaseUser.user_metadata?.picture,
  });

  useEffect(() => {
    const initializeAuth = async () => {
      const session = await authService.getSession();
      if (session?.user) {
        setAuthState({
          user: mapUser(session.user),
          isLoading: false,
        });
      } else {
        setAuthState({ user: null, isLoading: false });
      }
    };

    initializeAuth();

    const subscription = authService.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthState({
          user: mapUser(session.user),
          isLoading: false,
        });
      } else {
        setAuthState({ user: null, isLoading: false });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    await authService.signOut();
    router.replace('/');
  };

  const protectRoute = useCallback(
    (redirectTo: string = '/') => {
      if (!authState.isLoading && !authState.user) {
        router.replace(redirectTo);
      }
    },
    [authState.isLoading, authState.user, router],
  );

  return {
    ...authState,
    // 🎯 Exportando explicitamente para facilitar o uso na Navbar
    avatarUrl: authState.user?.avatarUrl,
    logout,
    protectRoute,
  };
};