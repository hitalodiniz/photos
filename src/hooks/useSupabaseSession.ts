'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase.client';
import { getValidGoogleToken } from '@/actions/google.actions';
import type { User, Session } from '@supabase/supabase-js';

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
  const fetchSessionRef = useRef<((forceRefresh?: boolean) => Promise<{ session: Session; userId: string } | null>) | null>(null);

  // Buscar sessão atual com retry logic para subdomínios
  const fetchSession = useCallback(async (forceRefresh = false): Promise<{ session: Session; userId: string } | null> => {
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
        // Usa a referência para evitar problema de acesso antes da declaração
        if (fetchSessionRef.current) {
          return fetchSessionRef.current(true);
        }
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
    } catch (error: unknown) {
      console.error('Erro ao buscar sessão:', error);
      
      // Retry logic para subdomínios
      if (isSubdomainRef.current && retryCountRef.current < 2 && !forceRefresh) {
        retryCountRef.current += 1;
        await new Promise(resolve => setTimeout(resolve, 200));
        // Usa a referência para evitar problema de acesso antes da declaração
        if (fetchSessionRef.current) {
          return fetchSessionRef.current(true);
        }
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

  // Atualiza a referência quando fetchSession muda
  useEffect(() => {
    fetchSessionRef.current = fetchSession;
  }, [fetchSession]);

  // Inicializar e escutar mudanças de autenticação
  useEffect(() => {
    // Reset refs quando o componente monta
    retryCountRef.current = 0;
    hasRefreshedRef.current = false;
    isSubdomainRef.current = isSubdomain();

    // Inicializa a sessão - necessário para carregar estado inicial
    // Nota: Este é um caso válido onde precisamos inicializar estado no useEffect
    void fetchSession();

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
    const startTime = Date.now();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'server';
    
    console.log('[useSupabaseSession] getAuthDetails chamado', {
      hasUser: !!sessionData.user,
      userId: sessionData.userId || sessionData.user?.id,
      isLoading: sessionData.isLoading,
      origin,
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NÃO CONFIGURADO',
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
      cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 'não configurado',
    });

    // 🎯 ESTRATÉGIA MELHORADA: Tenta múltiplas fontes para obter userId
    let userId: string | null = sessionData.userId || sessionData.user?.id || null;

    // Se não temos userId no estado, tenta buscar diretamente do Supabase (mais rápido)
    if (!userId) {
      console.log('[useSupabaseSession] ⚠️ UserId não encontrado no estado, iniciando busca direta...');
      
      // Verifica se o Supabase está configurado
      if (!supabase) {
        console.error('[useSupabaseSession] ❌ Cliente Supabase não está inicializado!');
        return { accessToken: null, userId: null };
      }
      
      try {
        // 🎯 BUSCA DIRETA: Usa getSession diretamente com timeout curto (2s)
        console.log('[useSupabaseSession] Tentando getSession() diretamente...');
        const sessionStartTime = Date.now();
        
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) => {
          setTimeout(() => {
            const elapsed = Date.now() - sessionStartTime;
            console.warn(`[useSupabaseSession] ⏱️ Timeout ao buscar sessão diretamente (2s) - decorrido: ${elapsed}ms`);
            resolve({ data: { session: null }, error: null });
          }, 2000); // Reduzido para 2s para ser mais rápido
        });

        const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
        const sessionDuration = Date.now() - sessionStartTime;
        
        console.log('[useSupabaseSession] Resultado getSession:', {
          hasError: !!error,
          hasSession: !!data?.session,
          hasUser: !!data?.session?.user,
          userId: data?.session?.user?.id,
          duration: `${sessionDuration}ms`,
        });
        
        if (error) {
          console.error('[useSupabaseSession] ❌ Erro ao buscar sessão diretamente:', {
            error: error.message,
            status: error.status,
            name: error.name,
          });
        } else if (data?.session?.user) {
          userId = data.session.user.id;
          console.log('[useSupabaseSession] ✅ Sessão encontrada diretamente!', {
            userId,
            email: data.session.user.email,
            duration: `${sessionDuration}ms`,
          });
          
          // Atualiza o estado para próxima vez
          setSessionData({
            user: data.session.user,
            accessToken: null,
            userId: data.session.user.id,
            isLoading: false,
          });
        } else {
          console.log('[useSupabaseSession] ⚠️ Sessão não encontrada diretamente, tentando fetchSession como fallback...');
          // Fallback para fetchSession (pode demorar mais, mas tenta)
          const fetchStartTime = Date.now();
          const result = await Promise.race([
            fetchSession(true),
            new Promise<null>((resolve) => {
              setTimeout(() => {
                const elapsed = Date.now() - fetchStartTime;
                console.warn(`[useSupabaseSession] ⏱️ Timeout no fetchSession (3s) - decorrido: ${elapsed}ms`);
                resolve(null);
              }, 3000);
            }),
          ]);
          
          if (result) {
            userId = result.userId;
            const fetchDuration = Date.now() - fetchStartTime;
            console.log('[useSupabaseSession] ✅ Sessão encontrada via fetchSession!', {
              userId,
              duration: `${fetchDuration}ms`,
            });
          } else {
            console.warn('[useSupabaseSession] ⚠️ fetchSession também não retornou sessão');
          }
        }
      } catch (err) {
        console.error('[useSupabaseSession] ❌ Erro ao buscar sessão:', {
          error: err,
          message: err instanceof Error ? err.message : 'Erro desconhecido',
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
    } else {
      console.log('[useSupabaseSession] ✅ UserId já disponível no estado:', userId);
    }

    if (!userId) {
      console.error('[useSupabaseSession] ❌ UserId não encontrado após todas as tentativas', {
        totalDuration: `${Date.now() - startTime}ms`,
        origin: typeof window !== 'undefined' ? window.location.origin : 'server',
      });
      return { accessToken: null, userId: null };
    }

    console.log('[useSupabaseSession] 🔍 Buscando token do Google para userId:', userId);
    
    // Buscar token do Google via server action
    // Com a estratégia dual, não tratamos ausência de token como erro
    try {
      const tokenStartTime = Date.now();
      const accessToken = await getValidGoogleToken(userId);
      const tokenDuration = Date.now() - tokenStartTime;
      const totalDuration = Date.now() - startTime;
      
      console.log('[useSupabaseSession] Token recebido:', {
        hasToken: !!accessToken,
        tokenLength: accessToken?.length || 0,
        tokenDuration: `${tokenDuration}ms`,
        totalDuration: `${totalDuration}ms`,
      });
      
      // Se não houver token, ainda retorna userId (sistema tentará usar API Key)
      if (!accessToken) {
        console.warn('[useSupabaseSession] ⚠️ Token não disponível. Sistema tentará usar API Key.', {
          totalDuration: `${Date.now() - startTime}ms`,
        });
        return {
          accessToken: null,
          userId,
        };
      }
      
      console.log('[useSupabaseSession] ✅ getAuthDetails concluído com sucesso!', {
        hasToken: true,
        userId,
        totalDuration: `${totalDuration}ms`,
      });
      
      return {
        accessToken,
        userId,
      };
    } catch (err) {
      console.error('[useSupabaseSession] ❌ Falha ao obter token do Google:', {
        error: err,
        message: err instanceof Error ? err.message : 'Erro desconhecido',
        stack: err instanceof Error ? err.stack : undefined,
        totalDuration: `${Date.now() - startTime}ms`,
      });
      // Em caso de erro, retorna null para permitir fallback com API Key
      return {
        accessToken: null,
        userId,
      };
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
