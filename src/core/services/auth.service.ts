/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 *
 * Este arquivo gerencia:
 * - Busca de sessão atual
 * - Refresh automático de tokens
 * - Limpeza de sessões inválidas
 * - Login com Google OAuth
 * - Logout
 *
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Qualquer bug pode quebrar toda a autenticação
 * - Pode permitir acesso não autorizado
 * - Pode expor sessões inválidas
 *
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Crie/atualize testes unitários (já existe auth.service.spec.ts)
 * 4. Teste extensivamente localmente
 * 5. Solicite revisão de código
 *
 * 📋 CHECKLIST OBRIGATÓRIO:
 * [ ] Testes unitários criados/atualizados
 * [ ] Testado getSession() com vários cenários
 * [ ] Testado refresh automático
 * [ ] Testado limpeza de sessão inválida
 * [ ] Revisão de código aprovada
 * [ ] Documentação atualizada
 *
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

// src/services/auth.service.ts
import { getBaseUrl } from '@/lib/get-base-url';
import { supabase } from '@/lib/supabase.client';
import { now as nowFn, utcIsoFrom } from '@/core/utils/data-helpers';
import { Session } from '@supabase/supabase-js';

// Use globalThis to ensure singleton even with multiple module evaluations
const GLOBAL_CACHE_KEY = '___PHOTOS_AUTH_CACHE___';

if (!(globalThis as any)[GLOBAL_CACHE_KEY]) {
  (globalThis as any)[GLOBAL_CACHE_KEY] = {
    refreshPromise: null,
    sessionPromise: null,
    profileCache: new Map<string, Promise<any>>(),
    lastRefreshTime: 0,
    hasRefreshedSubdomain: false,
  };
}

const authCache = (globalThis as any)[GLOBAL_CACHE_KEY];

export const authService = {
  // Busca a sessão atual com cache de promessa para evitar múltiplas chamadas
  async getSession() {
    if (authCache.sessionPromise) {
      return authCache.sessionPromise;
    }

    authCache.sessionPromise = (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          // Em caso de erro, não limpamos a sessão agressivamente para evitar loops de 429
          return null;
        }

        if (data.session) {
          const expiresAt = data.session.expires_at;
          if (expiresAt) {
            const now = Math.floor(nowFn().getTime() / 1000);
            const expiresIn = expiresAt - now;

            if (expiresIn < 300) {
              const refreshData = await this.refreshSession();
              // 🎯 MELHORIA: Se o refresh falhar ou for ignorado por trava,
              // ainda assim retornamos a sessão atual para evitar deslogar o usuário
              return refreshData.data?.session || data.session;
            }
          }
        }

        return data.session;
      } catch {
        return null;
      } finally {
        authCache.sessionPromise = null;
      }
    })();

    return authCache.sessionPromise;
  },

  // Escuta mudanças de autenticação
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void,
  ) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Limpa cache de sessão em qualquer mudança relevante
      authCache.sessionPromise = null;
      callback(event, session);
    });
    return subscription;
  },

  // Logout
  async signOut() {
    authCache.profileCache.clear();
    authCache.sessionPromise = null;
    authCache.refreshPromise = null;
    await supabase.auth.signOut();
  },

  // Refresh manual de sessão com trava para evitar loop
  async refreshSession() {
    if (authCache.refreshPromise) {
      return authCache.refreshPromise;
    }

    const now = nowFn().getTime();
    if (now - authCache.lastRefreshTime < 10000) {
      return { data: { session: null }, error: null };
    }

    authCache.lastRefreshTime = now;
    authCache.refreshPromise = (async () => {
      try {
        const result = await supabase.auth.refreshSession();

        if (result.error) {
          if (
            result.error.message?.includes('refresh_token') ||
            result.error.message?.includes('Invalid')
          ) {
            await supabase.auth.signOut();
          }
        }

        return result;
      } finally {
        authCache.refreshPromise = null;
      }
    })();

    return authCache.refreshPromise;
  },

  // Busca perfil do usuário logado com cache de promessa global
  async getProfile(userId: string) {
    if (!userId) return null;

    if (authCache.profileCache.has(userId)) {
      return authCache.profileCache.get(userId);
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('tb_profiles')
          .select('profile_picture_url, roles')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return data;
      } catch (err: any) {
        // Se for erro de rate limit (429), mantém o erro no cache por 5 segundos
        // para evitar novas requisições imediatas
        if (err?.status === 429) {
          // console.warn('[authService] Rate limit atingido ao buscar perfil, aguardando 5s...');
          setTimeout(() => {
            if (authCache.profileCache.get(userId) === fetchPromise) {
              authCache.profileCache.delete(userId);
            }
          }, 5000);
          return null;
        }

        authCache.profileCache.delete(userId);
        return null;
      }
    })();

    authCache.profileCache.set(userId, fetchPromise);
    return fetchPromise;
  },

  /**
   * Faz login com Google
   * @param forceConsent - Se true, força prompt: 'consent' para garantir refresh_token
   *                       Se false (padrão), usa 'select_account' para login rápido
   */
  async signInWithGoogle(forceConsent: boolean = false) {
    const baseUrl = getBaseUrl();
    const redirectTo = `${baseUrl}/api/auth/callback`;

    // 🎯 NOVA LÓGICA: Sempre usa 'select_account' por padrão (login rápido)
    // Se forceConsent=true, usa 'consent' (para quando refresh token não foi obtido)
    const promptValue = forceConsent ? 'consent' : 'select_account';

    // console.log('[authService] Iniciando login Google:', {
    //   forceConsent,
    //   prompt: promptValue,
    //   redirectTo,
    //   access_type: 'offline',
    //   motivo: forceConsent
    //     ? 'Consent forçado - necessário para obter refresh token'
    //     : 'Login padrão com select_account (rápido)',
    // });

    const { error, data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes:
          'email profile openid https://www.googleapis.com/auth/drive.readonly',
        redirectTo,
        queryParams: {
          access_type: 'offline', // 🎯 CRÍTICO: Necessário para receber refresh_token
          prompt: promptValue,
        },
      },
    });

    if (error) {
      // console.error('[authService] Erro ao iniciar login Google:', error);
      throw error;
    }

    // console.log('[authService] Login Google iniciado com sucesso. URL:', data?.url);

    return data;
  },
};
