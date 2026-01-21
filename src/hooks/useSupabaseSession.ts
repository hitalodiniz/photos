/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Estado de sessão do Supabase (otimizado para evitar múltiplos listeners)
 * - Obtenção de tokens do Google para Google Picker via Server Action
 * - Fallback automático para AuthContext para reduzir requisições ao Supabase
 */

'use client';

import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { authService, AuthContext } from '@photos/core-auth';
import { getValidGoogleToken } from '@/actions/google.actions';
import type { User, Session } from '@supabase/supabase-js';

interface SessionData {
  user: User | null;
  roles: string[];
  accessToken: string | null;
  userId: string | null;
  isLoading: boolean;
}

/**
 * Hook para centralizar autenticação do Supabase.
 * OTIMIZADO: Agora é um "pass-through" para o AuthContext quando disponível,
 * evitando disparar múltiplas requisições paralelas ao Supabase.
 */
export function useSupabaseSession() {
  // 🎯 FONTE DE VERDADE: Tenta usar o AuthContext global primeiro
  const authContext = useContext(AuthContext);

  const [sessionData, setSessionData] = useState<SessionData>({
    user: null,
    roles: [],
    accessToken: null,
    userId: null,
    isLoading: true,
  });

  // Ref para evitar loops em subdomínios
  const hasRefreshedRef = useRef(false);

  // Sincroniza o estado local com o AuthContext se ele existir
  useEffect(() => {
    if (authContext) {
      setSessionData({
        user: authContext.user,
        roles: authContext.roles || [],
        accessToken: null,
        userId: authContext.user?.id || null,
        isLoading: authContext.isLoading,
      });
    }
  }, [authContext?.user, authContext?.roles, authContext?.isLoading]);

  // Se NÃO houver AuthContext, o hook se comporta de forma independente (fallback)
  useEffect(() => {
    if (authContext) return; // Se tem contexto, o useEffect do contexto já cuida de tudo

    // console.log('[useSupabaseSession] AuthContext não encontrado, rodando em modo independente');
    
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const session = await authService.getSession();
        if (!isMounted) return;

        if (session?.user) {
          const profile = await authService.getProfile(session.user.id);
          if (!isMounted) return;

          setSessionData({
            user: session.user,
            roles: profile?.roles || [],
            accessToken: null,
            userId: session.user.id,
            isLoading: false,
          });
        } else {
          setSessionData(prev => ({ ...prev, isLoading: false }));
        }
      } catch {
        if (isMounted) setSessionData(prev => ({ ...prev, isLoading: false }));
      }
    };

    void fetchSession();

    const subscription = authService.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const profile = await authService.getProfile(session.user.id);
        if (isMounted) {
          setSessionData({
            user: session.user,
            roles: profile?.roles || [],
            accessToken: null,
            userId: session.user.id,
            isLoading: false,
          });
        }
      } else {
        setSessionData({
          user: null,
          roles: [],
          accessToken: null,
          userId: null,
          isLoading: false,
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [authContext]);

  /**
   * getAuthDetails obtém o token do Google via server action quando necessário.
   * Centralizado aqui para ser compatível com o código que usa Google Picker.
   */
  const getAuthDetails = useCallback(async () => {
    const userId = sessionData.userId || authContext?.user?.id;

    if (!userId) {
      // Se ainda não temos userId, tenta um último fetchSession rápido (com cache do service)
      const session = await authService.getSession();
      if (!session?.user?.id) return { accessToken: null, userId: null };
      return { accessToken: await getValidGoogleToken(session.user.id), userId: session.user.id };
    }

    try {
      const accessToken = await getValidGoogleToken(userId);
      return { accessToken, userId };
    } catch {
      return { accessToken: null, userId };
    }
  }, [sessionData.userId, authContext?.user?.id]);

  return {
    user: sessionData.user,
    userId: sessionData.userId,
    roles: sessionData.roles,
    isLoading: sessionData.isLoading,
    isAuthenticated: !!sessionData.user,
    getAuthDetails,
    refreshSession: () => authService.refreshSession(),
  };
}
