/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Estado de sessão do Supabase (otimizado para evitar múltiplos listeners)
 * - Obtenção de tokens do Google para Google Picker via Server Action
 * - Fallback automático para AuthContext para reduzir requisições ao Supabase
 */

'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
// 🛡️ IMPORT DIRETO: Necessário para evitar dependência circular com o pacote @photos/core-auth
import { authService } from '../core/services/auth.service';
import { AuthContext } from '../components/providers/AuthContext';
import { getValidGoogleToken } from '@/actions/google.actions';
import type { User } from '@supabase/supabase-js';

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

  // Sincroniza o estado local com o AuthContext se ele existir
  useEffect(() => {
    if (authContext) {
      setSessionData(prev => {
        // Só atualiza se algo mudou para evitar renders em cascata
        if (
          prev.user === authContext.user &&
          prev.roles === authContext.roles &&
          prev.isLoading === authContext.isLoading
        ) {
          return prev;
        }
        return {
          user: authContext.user,
          roles: authContext.roles || [],
          accessToken: null,
          userId: authContext.user?.id || null,
          isLoading: authContext.isLoading,
        };
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
    // 🎯 Tenta obter userId de múltiplas fontes
    let userId = sessionData.userId || authContext?.user?.id;

    if (!userId) {
      // console.log('[useSupabaseSession] UserId não encontrado no estado/contexto, tentando fetch rápido...');
      const session = await authService.getSession();
      if (session?.user?.id) {
        userId = session.user.id;
      }
    }

    if (!userId) {
      // console.error('[useSupabaseSession] UserId não encontrado após todas as tentativas');
      return { accessToken: null, userId: null };
    }

    try {
      // console.log('[useSupabaseSession] Buscando token do Google para userId:', userId);
      const accessToken = await getValidGoogleToken(userId);
      return { accessToken, userId };
    } catch (err) {
      // console.error('[useSupabaseSession] Erro ao obter token do Google:', err);
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
