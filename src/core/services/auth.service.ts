// src/services/auth.service.ts
import { getBaseUrl } from '@/lib/get-base-url';
import { supabase } from '@/lib/supabase.client';
import { Session } from '@supabase/supabase-js';

export const authService = {
  // Busca a sessão atual
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      // 🎯 TRATAMENTO: Se houver erro ou sessão inválida, limpa a sessão
      if (error) {
        console.error('[authService] Erro ao buscar sessão:', error);
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
            console.log('[authService] Sessão expirando, tentando refresh...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('[authService] Erro ao fazer refresh:', refreshError);
              // Se o refresh falhar, limpa a sessão
              if (refreshError.message?.includes('refresh_token') || refreshError.message?.includes('Invalid')) {
                await supabase.auth.signOut();
                return null;
              }
            } else if (refreshData.session) {
              return refreshData.session;
            }
          }
        }
      }

      return data.session;
    } catch (error) {
      console.error('[authService] Erro crítico ao buscar sessão:', error);
      // Em caso de erro crítico, limpa a sessão
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('[authService] Erro ao fazer signOut:', signOutError);
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
      callback(event, session);
    });
    return subscription;
  },

  // Logout
  async signOut() {
    await supabase.auth.signOut();
  },

  async signInWithGoogle(forceConsent: boolean = false) {
    const baseUrl = getBaseUrl();
    const redirectTo = `${baseUrl}/api/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',

      options: {
        scopes:
          'email profile openid https://www.googleapis.com/auth/drive.readonly',
        redirectTo,
        queryParams: {
          access_type: 'offline',
          // 🎯 Lógica Condicional: Se forceConsent for true, usa 'consent' para garantir o refresh_token
          prompt: forceConsent ? 'consent' : 'select_account',
        },
      },
    });

    if (error) throw error;
  },
};
