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
import { Session } from '@supabase/supabase-js';

// Variável global para evitar múltiplos refreshes paralelos
let refreshPromise: Promise<any> | null = null;

export const authService = {
  // Busca a sessão atual
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      // 🎯 TRATAMENTO: Se houver erro ou sessão inválida, limpa a sessão
      if (error) {
        // console.error('[authService] Erro ao buscar sessão:', error);
        // Limpa sessão inválida
        await supabase.auth.signOut();
        return null;
      }

      // 🎯 VERIFICAÇÃO: Se a sessão existe mas está expirada, tenta refresh
      if (data.session) {
        // Verifica se o token está expirado (com margem de 5 minutos)
        const expiresAt = data.session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const expiresIn = expiresAt - now;
          
          // Se expira em menos de 5 minutos, tenta refresh
          if (expiresIn < 300) {
            // console.log('[authService] Sessão expirando, tentando refresh...');
            
            const refreshData = await this.refreshSession();
            return refreshData.data?.session || null;
          }
        }
      }

      return data.session;
    } catch {
      // console.error('[authService] Erro crítico ao buscar sessão:', error);
      // Em caso de erro crítico, limpa a sessão
      try {
        await supabase.auth.signOut();
      } catch {
        // console.error('[authService] Erro ao fazer signOut:', signOutError);
      }
      return null;
    }
  },

  // Escuta mudanças de autenticação
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void,
  ) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // 🚀 LOG: Monitora qual evento de auth está sendo disparado
      // console.log(`[authService] Evento de auth: ${event}`, { userId: session?.user?.id });
      callback(event, session);
    });
    return subscription;
  },

  // Logout
  async signOut() {
    await supabase.auth.signOut();
  },

  // Refresh manual de sessão com trava para evitar loop
  async refreshSession() {
    // 🛡️ TRAVA: Se já existe um refresh em andamento, retorna a mesma promise
    if (refreshPromise) {
      // console.log('[authService] Refresh já em andamento, reutilizando promise...');
      return refreshPromise;
    }

    // console.log('[authService] Iniciando refresh de sessão...');
    refreshPromise = supabase.auth.refreshSession();
    
    try {
      const result = await refreshPromise;
      
      if (result.error) {
        // console.error('[authService] Erro no refresh:', result.error.message);
        // Se o refresh falhar por token inválido, desloga
        if (result.error.message?.includes('refresh_token') || result.error.message?.includes('Invalid')) {
          await supabase.auth.signOut();
        }
      }
      
      return result;
    } finally {
      // 🎯 LIMPEZA: Sempre limpa a variável ao finalizar
      refreshPromise = null;
    }
  },

  // Busca perfil do usuário logado
  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tb_profiles')
        .select('profile_picture_url, roles')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch {
      return null;
    }
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
