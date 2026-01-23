/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Estado de sessão do Supabase
 * - Busca de userId de múltiplas fontes (sessionData → AuthContext → Supabase)
 * - Obtenção de tokens do Google para Google Picker
 * - Retry logic para subdomínios
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Qualquer bug pode quebrar autenticação em toda a aplicação
 * - Pode causar timeouts no Google Picker
 * - Pode expor dados de sessão incorretamente
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda a estratégia de fallback (AuthContext → Supabase)
 * 4. Crie/atualize testes unitários
 * 5. Teste extensivamente localmente
 * 6. Solicite revisão de código
 * 
 * 📋 CHECKLIST OBRIGATÓRIO:
 * [ ] Testes unitários criados/atualizados
 * [ ] Testado getAuthDetails() com vários cenários
 * [ ] Testado fallback para AuthContext
 * [ ] Testado timeout handling
 * [ ] Revisão de código aprovada
 * [ ] Documentação atualizada
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '@photos/core-auth';
import { getValidGoogleToken } from '@/actions/google.actions';
import type { User, Session } from '@supabase/supabase-js';
import { useContext } from 'react';
import { AuthContext } from '@/components/providers/AuthContext';

interface SessionData {
  user: User | null;
  roles: string[];
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
    roles: [],
    accessToken: null,
    userId: null,
    isLoading: true,
  });

  // 🎯 FALLBACK: Usa AuthContext como fonte alternativa de userId
  // Usa useContext diretamente para evitar erro se não estiver disponível
  const authContextValue = useContext(AuthContext) as { user?: { id: string }; roles: string[]; isLoading: boolean } | undefined;

  const retryCountRef = useRef(0);
  const isSubdomainRef = useRef(isSubdomain());
  const hasRefreshedRef = useRef(false);
  const fetchSessionRef = useRef<((forceRefresh?: boolean) => Promise<{ session: Session; userId: string } | null>) | null>(null);

  // Ref para evitar buscas redundantes no hook
  const lastFetchedProfileId = useRef<string | null>(null);

  // Buscar perfil para obter roles
  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId || lastFetchedProfileId.current === userId) {
      return sessionData.roles || [];
    }

    try {
      // console.log('[useSupabaseSession] Buscando perfil para roles:', userId);
      const profile = await authService.getProfile(userId);
      lastFetchedProfileId.current = userId;
      return profile?.roles || [];
    } catch {
      return [];
    }
  }, [sessionData.roles]);

  // Buscar sessão atual com retry logic para subdomínios
  const fetchSession = useCallback(async (forceRefresh = false): Promise<{ session: Session; userId: string } | null> => {
    try {
      // Se estamos em subdomínio e ainda não fizemos refresh, tenta refresh primeiro
      if (isSubdomainRef.current && !hasRefreshedRef.current && !forceRefresh) {
        try {
          const { data: refreshData, error: refreshError } = await authService.refreshSession();
          if (!refreshError && refreshData.session) {
            hasRefreshedRef.current = true;
            const roles = await fetchProfile(refreshData.session.user.id);
            setSessionData({
              user: refreshData.session.user,
              roles,
              accessToken: null,
              userId: refreshData.session.user.id,
              isLoading: false,
            });
            return { session: refreshData.session, userId: refreshData.session.user.id };
          }
        } catch {
          // console.warn('Tentativa de refresh falhou, tentando getSession:', refreshErr);
        }
      }

      const session = await authService.getSession();

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

      if (!session?.user) {
        setSessionData({
          user: null,
          roles: [],
          accessToken: null,
          userId: null,
          isLoading: false,
        });
        return null;
      }

      const roles = await fetchProfile(session.user.id);
      setSessionData({
        user: session.user,
        roles,
        accessToken: null, // Token do Google será obtido via getAuthDetails quando necessário
        userId: session.user.id,
        isLoading: false,
      });

      retryCountRef.current = 0; // Reset retry count on success
      return { session, userId: session.user.id };
    } catch {
      // console.error('Erro ao buscar sessão:', error);
      
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
        roles: [],
        accessToken: null,
        userId: null,
        isLoading: false,
      });
      return null;
    }
  }, [fetchProfile]);

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

    const subscription = authService.onAuthStateChange(async (event, session) => {
      // 🚀 LOG: Monitora qual evento de auth está sendo disparado no hook de sessão
      // console.log(`[useSupabaseSession] Evento de auth: ${event}`, { userId: session?.user?.id });

      // Em subdomínios, faz refresh quando há mudanças de auth state
      if (isSubdomainRef.current && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try {
          // 🛡️ Previne refresh se já tivermos uma sessão válida recentemente
          if (session?.user && !isSubdomainRef.current) {
             // Se não for subdomínio, não precisa forçar refresh aqui
          } else {
            const { data: refreshData } = await authService.refreshSession();
            if (refreshData.session) {
              const roles = await fetchProfile(refreshData.session.user.id);
              setSessionData({
                user: refreshData.session.user,
                roles,
                accessToken: null,
                userId: refreshData.session.user.id,
                isLoading: false,
              });
              return;
            }
          }
        } catch (_err) {
          console.warn('Erro ao fazer refresh no auth state change:', _err);
        }
      }

      if (session?.user) {
        const roles = await fetchProfile(session.user.id);
        setSessionData({
          user: session.user,
          roles,
          accessToken: null, // Token do Google será obtido via getAuthDetails quando necessário
          userId: session.user.id,
          isLoading: false,
        });
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
      subscription.unsubscribe();
    };
  }, [fetchSession, fetchProfile]);

    // Obter detalhes de autenticação incluindo token do Google (compatível com código existente)
  const getAuthDetails = useCallback(async () => {
    // 🎯 ESTRATÉGIA MELHORADA: Tenta múltiplas fontes para obter userId
    // 1. Estado do hook
    // 2. AuthContext (fonte confiável quando Supabase falha)
    // 3. Busca direta do Supabase (pode dar timeout em produção)
    let userId: string | null = sessionData.userId || sessionData.user?.id || null;

    // 🎯 PRIORIDADE: Se não temos userId, tenta usar AuthContext PRIMEIRO (mais confiável)
    // O AuthContext já está funcionando e tem o usuário autenticado
    if (!userId && authContextValue?.user?.id && !authContextValue.isLoading) {
      userId = authContextValue.user.id;
      // console.log('[useSupabaseSession] ✅ UserId obtido do AuthContext (fonte primária):', userId);
      
      // Se já temos userId do AuthContext, não precisa tentar Supabase (evita timeout)
      // Vai direto buscar o token do Google
    } else if (!userId) {
      // Se ainda não temos userId, tenta buscar diretamente do Supabase (pode dar timeout)
      // console.log('[useSupabaseSession] ⚠️ UserId não encontrado em nenhuma fonte, tentando Supabase...');
      
      // Se o AuthContext também não tem userId, então realmente não há usuário autenticado
      if (!authContextValue?.user?.id && !authContextValue?.isLoading) {
        // console.warn('[useSupabaseSession] ⚠️ AuthContext também não tem userId. Usuário pode não estar autenticado.');
        return { accessToken: null, userId: null };
      }
      
      try {
        // 🎯 BUSCA DIRETA: Usa getSession diretamente com timeout curto (2s)
        // console.log('[useSupabaseSession] Tentando getSession() diretamente...');
        
        const sessionPromise = authService.getSession();
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            // console.warn(`[useSupabaseSession] ⏱️ Timeout ao buscar sessão diretamente (2s) - decorrido: ${elapsed}ms`);
            resolve(null);
          }, 2000); // Reduzido para 2s para ser mais rápido
        });

        const session = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (session?.user) {
          userId = session.user.id;
          
          // Atualiza o estado para próxima vez
          const roles = await fetchProfile(session.user.id);
          setSessionData({
            user: session.user,
            roles,
            accessToken: null,
            userId: session.user.id,
            isLoading: false,
          });
        } else {
          // console.log('[useSupabaseSession] ⚠️ Sessão não encontrada diretamente, tentando fetchSession como fallback...');
          // Fallback para fetchSession (pode demorar mais, mas tenta)
          const result = await Promise.race([
            fetchSession(true),
            new Promise<null>((resolve) => {
              setTimeout(() => {
                // console.warn(`[useSupabaseSession] ⏱️ Timeout no fetchSession (3s) - decorrido: ${elapsed}ms`);
                resolve(null);
              }, 3000);
            }),
          ]);
          
          if (result) {
            userId = result.userId;
          } else {
            // 🎯 ÚLTIMO FALLBACK: Tenta usar AuthContext se disponível
            if (!userId && authContextValue?.user?.id && !authContextValue.isLoading) {
              userId = authContextValue.user.id;
            }
          }
        }
      } catch {
        // Fallback para AuthContext
        if (authContextValue?.user?.id) {
          userId = authContextValue.user.id;
        }
      }
    }

    if (!userId) {
      return { accessToken: null, userId: null };
    }

    // Buscar token do Google via server action
    // Com a estratégia dual, não tratamos ausência de token como erro
    try {
      const accessToken = await getValidGoogleToken(userId);
      
      // Se não houver token, ainda retorna userId (sistema tentará usar API Key)
      if (!accessToken) {
        return {
          accessToken: null,
          userId,
        };
      }
      
      return {
        accessToken,
        userId,
      };
    } catch {
      // Em caso de erro, retorna null para permitir fallback com API Key
      return {
        accessToken: null,
        userId,
      };
    }
  }, [sessionData, fetchSession, authContextValue, fetchProfile]);

  return {
    user: sessionData.user,
    userId: sessionData.userId,
    roles: sessionData.roles || authContextValue?.roles || [],
    isLoading: sessionData.isLoading,
    isAuthenticated: !!sessionData.user,
    getAuthDetails,
    refreshSession: () => fetchSession(true),
  };
}
