'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase.client';
import { getValidGoogleToken } from '@/actions/google.actions';
import type { User } from '@supabase/supabase-js';

interface SessionData {
  user: User | null;
  accessToken: string | null;
  userId: string | null;
  isLoading: boolean;
}

/**
 * Detecta se estamos em um subdomínio
 */
function isSubdomain(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  const isLocal = hostname.includes('localhost');
  
  if (isLocal) {
    // Em localhost: subdomain.localhost
    const chunks = hostname.split('.');
    return chunks.length > 1 && chunks[chunks.length - 1] === 'localhost' && chunks[0] !== 'www';
  }
  
  // Em produção: subdomain.domain.com
  const chunks = hostname.split('.');
  return chunks.length > 2 && chunks[0] !== 'www';
}

/**
 * Hook para centralizar autenticação do Supabase
 * Melhorado para funcionar corretamente em subdomínios diferentes
 * Nota: getAuthDetails obtém o token do Google via server action quando necessário
 */
export function useSupabaseSession() {
  const [sessionData, setSessionData] = useState<SessionData>({
    user: null,
    accessToken: null,
    userId: null,
    isLoading: true,
  });

  const retryCountRef = useRef(0);
  const isSubdomainRef = useRef(isSubdomain());
  const hasRefreshedRef = useRef(false);

  // Buscar sessão atual com retry logic para subdomínios
  const fetchSession = useCallback(async (forceRefresh = false): Promise<{ session: any; userId: string } | null> => {
    try {
      // Se estamos em subdomínio e ainda não fizemos refresh, tenta refresh primeiro
      if (isSubdomainRef.current && !hasRefreshedRef.current && !forceRefresh) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            hasRefreshedRef.current = true;
            setSessionData({
              user: refreshData.session.user,
              accessToken: null,
              userId: refreshData.session.user.id,
              isLoading: false,
            });
            return { session: refreshData.session, userId: refreshData.session.user.id };
          }
        } catch (refreshErr) {
          console.warn('Tentativa de refresh falhou, tentando getSession:', refreshErr);
        }
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      // Se não há sessão e estamos em subdomínio, tenta mais uma vez com refresh
      if (!session?.user && isSubdomainRef.current && retryCountRef.current < 2 && !forceRefresh) {
        retryCountRef.current += 1;
        // Aguarda um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 100));
        return fetchSession(true);
      }

      if (error) {
        console.error('Erro ao buscar sessão:', error);
      }

      if (!session?.user) {
        setSessionData({
          user: null,
          accessToken: null,
          userId: null,
          isLoading: false,
        });
        return null;
      }

      setSessionData({
        user: session.user,
        accessToken: null, // Token do Google será obtido via getAuthDetails quando necessário
        userId: session.user.id,
        isLoading: false,
      });

      retryCountRef.current = 0; // Reset retry count on success
      return { session, userId: session.user.id };
    } catch (error: any) {
      console.error('Erro ao buscar sessão:', error);
      
      // Retry logic para subdomínios
      if (isSubdomainRef.current && retryCountRef.current < 2 && !forceRefresh) {
        retryCountRef.current += 1;
        await new Promise(resolve => setTimeout(resolve, 200));
        return fetchSession(true);
      }

      setSessionData({
        user: null,
        accessToken: null,
        userId: null,
        isLoading: false,
      });
      return null;
    }
  }, []);

  // Inicializar e escutar mudanças de autenticação
  useEffect(() => {
    // Reset refs quando o componente monta
    retryCountRef.current = 0;
    hasRefreshedRef.current = false;
    isSubdomainRef.current = isSubdomain();

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Em subdomínios, faz refresh quando há mudanças de auth state
      if (isSubdomainRef.current && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData.session) {
            setSessionData({
              user: refreshData.session.user,
              accessToken: null,
              userId: refreshData.session.user.id,
              isLoading: false,
            });
            return;
          }
        } catch (err) {
          console.warn('Erro ao fazer refresh no auth state change:', err);
        }
      }

      if (session?.user) {
        setSessionData({
          user: session.user,
          accessToken: null, // Token do Google será obtido via getAuthDetails quando necessário
          userId: session.user.id,
          isLoading: false,
        });
      } else {
        setSessionData({
          user: null,
          accessToken: null,
          userId: null,
          isLoading: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSession]);

  // Obter detalhes de autenticação incluindo token do Google (compatível com código existente)
  const getAuthDetails = useCallback(async () => {
    if (!sessionData.user) {
      const result = await fetchSession(true);
      if (!result) {
        return { accessToken: null, userId: null };
      }
    }

    const userId = sessionData.userId || sessionData.user?.id;
    if (!userId) {
      return { accessToken: null, userId: null };
    }

    // Buscar token do Google via server action
    // Com a estratégia dual, não tratamos ausência de token como erro
    try {
      const accessToken = await getValidGoogleToken(userId);
      
      // Se não houver token, ainda retorna userId (sistema tentará usar API Key)
      if (!accessToken) {
        console.log('[useSupabaseSession] Token não disponível. Sistema tentará usar API Key.');
        return {
          accessToken: null,
          userId,
        };
      }
      
      return {
        accessToken,
        userId,
      };
    } catch (err) {
      console.error('Falha ao obter token do Google:', err);
      // Em caso de erro, retorna null para permitir fallback com API Key
      return {
        accessToken: null,
        userId,
      };
      return { accessToken: null, userId };
    }
  }, [sessionData, fetchSession]);

  return {
    user: sessionData.user,
    userId: sessionData.userId,
    isLoading: sessionData.isLoading,
    isAuthenticated: !!sessionData.user,
    getAuthDetails,
    refreshSession: () => fetchSession(true),
  };
}
